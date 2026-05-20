import os
import zipfile
import threading
from flask import Flask, send_from_directory, request, jsonify
from werkzeug.utils import secure_filename

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
DOMAIN = os.environ.get("DOMAIN", "http://localhost:8000")

app_web = Flask(__name__)
user_state = {}

WEBSITES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "websites")
os.makedirs(WEBSITES_DIR, exist_ok=True)


# 🌐 SERVE WEBSITE (FAST + FIXED)
@app_web.route("/<site>/")
@app_web.route("/<site>/<path:path>")
def serve(site, path=""):
    folder = os.path.join(WEBSITES_DIR, site)

    if not os.path.exists(folder):
        return "Site not found", 404

    try:
        if path:
            return send_from_directory(folder, path)

        for f in os.listdir(folder):
            if f.endswith(".html"):
                return send_from_directory(folder, f)

    except Exception as e:
        return f"Error: {str(e)}", 500

    return "No HTML file found", 404


# 📤 UPLOAD ZIP VIA API (for extension integration)
@app_web.route("/api/upload", methods=["POST"])
def upload_zip():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    site_name = request.form.get("name", "").strip()

    if not file.filename.endswith(".zip"):
        return jsonify({"error": "Only ZIP files allowed"}), 400

    if not site_name:
        site_name = secure_filename(file.filename.replace(".zip", "").replace("_working_clone", "").replace("_complete_clone", ""))

    site_name = secure_filename(site_name)
    base_folder = os.path.join(WEBSITES_DIR, site_name)
    os.makedirs(base_folder, exist_ok=True)

    zip_path = os.path.join(base_folder, "site.zip")
    file.save(zip_path)

    try:
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(base_folder)
    except Exception as e:
        return jsonify({"error": f"ZIP extraction failed: {str(e)}"}), 500

    os.remove(zip_path)

    # Fix nested folder structure
    while True:
        items = os.listdir(base_folder)
        if len(items) == 1 and os.path.isdir(os.path.join(base_folder, items[0])):
            inner = os.path.join(base_folder, items[0])
            for f in os.listdir(inner):
                os.rename(os.path.join(inner, f), os.path.join(base_folder, f))
            os.rmdir(inner)
        else:
            break

    link = f"{DOMAIN}/{site_name}/"
    return jsonify({"success": True, "name": site_name, "url": link})


# 📋 LIST ALL HOSTED SITES
@app_web.route("/api/sites", methods=["GET"])
def list_sites():
    sites = []
    if os.path.exists(WEBSITES_DIR):
        for name in os.listdir(WEBSITES_DIR):
            folder = os.path.join(WEBSITES_DIR, name)
            if os.path.isdir(folder):
                html_files = [f for f in os.listdir(folder) if f.endswith(".html")]
                sites.append({
                    "name": name,
                    "url": f"{DOMAIN}/{name}/",
                    "hasHTML": len(html_files) > 0
                })
    return jsonify({"sites": sites})


# 🗑️ DELETE A HOSTED SITE
@app_web.route("/api/delete/<site>", methods=["DELETE"])
def delete_site(site):
    import shutil
    folder = os.path.join(WEBSITES_DIR, secure_filename(site))
    if os.path.exists(folder):
        shutil.rmtree(folder)
        return jsonify({"success": True, "message": f"{site} deleted"})
    return jsonify({"error": "Site not found"}), 404


# 🚀 RUN FLASK
def run_web():
    port = int(os.environ.get("PORT", 8000))
    app_web.run(host="0.0.0.0", port=port, threaded=True, debug=False)


# 🤖 TELEGRAM BOT (optional — only runs if TOKEN is set)
def run_bot():
    if not TOKEN:
        print("[Dd-info WebHost] No TELEGRAM_BOT_TOKEN set, skipping bot.")
        return

    from telegram import Update
    from telegram.ext import (
        ApplicationBuilder, CommandHandler,
        MessageHandler, filters, ContextTypes
    )

    async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
        await update.message.reply_text("Send your website ZIP file")

    async def handle_file(update: Update, context: ContextTypes.DEFAULT_TYPE):
        doc = update.message.document
        user_id = update.message.from_user.id

        if not doc.file_name.endswith(".zip"):
            await update.message.reply_text("Only ZIP file allowed")
            return

        user_state[user_id] = doc.file_id
        await update.message.reply_text("Enter website name")

    async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = update.message.from_user.id

        if user_id not in user_state:
            return

        site = update.message.text.strip()
        base_folder = os.path.join(WEBSITES_DIR, site)
        os.makedirs(base_folder, exist_ok=True)

        file = await context.bot.get_file(user_state[user_id])
        zip_path = os.path.join(base_folder, "site.zip")
        await file.download_to_drive(zip_path)

        try:
            with zipfile.ZipFile(zip_path, "r") as zip_ref:
                zip_ref.extractall(base_folder)
        except Exception as e:
            await update.message.reply_text(f"ZIP error: {str(e)}")
            return

        os.remove(zip_path)

        while True:
            items = os.listdir(base_folder)
            if len(items) == 1 and os.path.isdir(os.path.join(base_folder, items[0])):
                inner = os.path.join(base_folder, items[0])
                for f in os.listdir(inner):
                    os.rename(os.path.join(inner, f), os.path.join(base_folder, f))
                os.rmdir(inner)
            else:
                break

        link = f"{DOMAIN}/{site}/"
        await update.message.reply_text(f"Website Deployed!\n\nName: {site}\nLink: {link}")
        del user_state[user_id]

    app = ApplicationBuilder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.Document.ALL, handle_file))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
    app.run_polling()


if __name__ == "__main__":
    os.makedirs(WEBSITES_DIR, exist_ok=True)
    threading.Thread(target=run_web).start()
    run_bot()
