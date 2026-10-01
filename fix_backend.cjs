const fs = require('fs');

let mainPath = '/home/i11wakura/Eco-map/backend/app/main.py';
let main = fs.readFileSync(mainPath, 'utf8');

main = main.replace(
  'upload_dir.mkdir(parents=True, exist_ok=True)',
  `try:
    upload_dir.mkdir(parents=True, exist_ok=True)
except Exception as e:
    import logging
    logging.warning(f"Failed to create upload directory {upload_dir}: {e}")`
);

main = main.replace(
  'app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")',
  `if upload_dir.exists() and upload_dir.is_dir():
    app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")
else:
    import logging
    logging.warning(f"Skipping mount for /uploads as directory {upload_dir} is not available")`
);

fs.writeFileSync(mainPath, main);

let routesPath = '/home/i11wakura/Eco-map/backend/app/routes.py';
let routes = fs.readFileSync(routesPath, 'utf8');

routes = routes.replace(
  'upload_dir.mkdir(parents=True, exist_ok=True)',
  `try:
        upload_dir.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create upload directory: {str(e)}")`
);
fs.writeFileSync(routesPath, routes);

