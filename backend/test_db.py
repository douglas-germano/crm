from app import create_app, db
from sqlalchemy import text
app = create_app()
with app.app_context():
    schemas = db.session.execute(text("SELECT schema_name FROM information_schema.schemata")).fetchall()
    schemata = [s[0] for s in schemas]
    print(f'Schemas: {schemata}')
    
    db.session.execute(text("SET search_path TO public"))
    tenants = db.session.execute(text("SELECT * FROM tenant")).fetchall()
    print(f'Tenants em public: {tenants}')

    db.session.execute(text("SET search_path TO engetch, public"))
    tables = db.session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'engetch'")).fetchall()
    print(f'Tabelas em engetch: {[t[0] for t in tables]}')
