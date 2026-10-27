from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "bia.db"
SECRET_KEY = "change-this-before-public-deployment"
