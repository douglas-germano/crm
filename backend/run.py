from dotenv import load_dotenv
load_dotenv()

import os

from app import create_app

config_name = (
    os.environ.get("FLASK_ENV")
    or os.environ.get("APP_ENV")
    or ("production" if os.environ.get("RAILWAY_ENVIRONMENT") else "development")
)

app = create_app(config_name)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(debug=app.config.get("DEBUG", False), host="0.0.0.0", port=port)
