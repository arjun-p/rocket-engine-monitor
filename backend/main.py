from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ============================================================================
# Configuration
# ============================================================================
ENV = os.getenv("ENV", "development")
PMTX_TOKEN = os.getenv("PMTX_TOKEN")
BASE_URL = os.getenv(
    "PROMETHEUX_BASE_URL",
    "https://api.prometheux.ai/jarvispy/solo/arjun-p"
)

# API Endpoints
VADALOG_EVALUATE_URL = f"{BASE_URL}/api/v1/vadalog/evaluate"
LLM_CONFIGURE_URL = f"{BASE_URL}/api/v1/llm/configure"

# Default CORS origins for production
DEFAULT_PROD_ORIGINS = [
    "https://rocket-monitor.vercel.app",
    "https://rocket-engine-monitor.vercel.app"
]

# CORS Configuration
def get_cors_origins():
    """Get CORS origins based on environment"""
    cors_env = os.getenv("CORS_ORIGINS", "")
    if cors_env:
        return [origin.strip() for origin in cors_env.split(",")]

    # Production: use CORS_ORIGINS_PROD if set, otherwise use defaults
    if ENV == "production":
        cors_prod = os.getenv("CORS_ORIGINS_PROD", "")
        if cors_prod:
            return [origin.strip() for origin in cors_prod.split(",")]
        return DEFAULT_PROD_ORIGINS

    # Development: allow all origins
    return ["*"]

CORS_ORIGINS = get_cors_origins()
CORS_CREDENTIALS = os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() == "true"
CORS_METHODS = os.getenv("CORS_ALLOW_METHODS", "*")
CORS_HEADERS = os.getenv("CORS_ALLOW_HEADERS", "*")

# Validation
if not PMTX_TOKEN:
    print("⚠️  Warning: PMTX_TOKEN not set")

print(f"🚀 Environment: {ENV}")
print(f"🌐 CORS Origins: {CORS_ORIGINS}")


app = FastAPI(
    title="Rocket Engine Failure Monitor API",
    description="API for monitoring and analyzing rocket engine component failures using Prometheux Platform",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=CORS_CREDENTIALS,
    allow_methods=CORS_METHODS.split(",") if CORS_METHODS != "*" else ["*"],
    allow_headers=CORS_HEADERS.split(",") if CORS_HEADERS != "*" else ["*"],
)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Rocket Engine Failure Monitor API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "prometheux_configured": PMTX_TOKEN is not None
    }


@app.get("/components", tags=["Data"])
async def get_components():
    """Get all rocket engine components from Prometheux"""
    if not PMTX_TOKEN:
        raise HTTPException(status_code=500, detail="Prometheux token not configured")

    # Get S3 credentials from environment
    s3_access_key = os.getenv("AWS_ACCESS_KEY_ID")
    s3_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    s3_bucket = os.getenv("S3_BUCKET", "prometheux-public-data-bucket")

    if not s3_access_key or not s3_secret_key:
        raise HTTPException(status_code=500, detail="S3 credentials not configured")

    # Load Vadalog program from file
    vadalog_file = os.path.join(os.path.dirname(__file__), "vadalog", "get_components.vada")
    with open(vadalog_file, "r") as f:
        vadalog_template = f.read()

    # Replace template variables
    vadalog_program = vadalog_template.format(
        s3_access_key=s3_access_key,
        s3_secret_key=s3_secret_key,
        s3_bucket=s3_bucket
    )

    # Prepare request payload
    payload = {
        "program": vadalog_program,
        "parameters": {},
        "execution_options": {
            "materialize_intermediate": True,
            "debug_mode": False,
            "max_iterations": 1000
        },
        "timeout": 300
    }

    try:
        # Call Prometheux Vadalog API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                VADALOG_EVALUATE_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {PMTX_TOKEN}"
                },
                json=payload,
                timeout=330.0
            )
            response.raise_for_status()
            data = response.json()

        # Parse Vadalog results
        if "data" not in data or "resultSet" not in data["data"]:
            raise HTTPException(status_code=500, detail=f"Invalid response format: {data}")

        result_set = data["data"]["resultSet"]
        if "component" not in result_set:
            raise HTTPException(status_code=500, detail=f"No component data in results: {data}")

        return [item[0] for item in result_set["component"]]

    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Prometheux API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching components: {str(e)}")


@app.get("/relationships", tags=["Components"])
async def get_relationships():
    """
    Get component dependency relationships (parent → child)
    Returns array of {source, target} pairs
    """
    # Mock relationships based on typical rocket engine architecture
    # TODO: Replace with Vadalog query to Neo4j via Prometheux API
    relationships = [
        # Main chain: Tank → Pump → Chamber → Nozzle
        {"source": "LOX_Tank", "target": "LPOTP"},
        {"source": "LPOTP", "target": "LPOTP_Discharge"},
        {"source": "LPOTP_Discharge", "target": "HPOTP"},
        {"source": "HPOTP", "target": "HPOTP_Discharge"},
        {"source": "HPOTP_Discharge", "target": "Oxidizer_Preburner"},
        {"source": "Oxidizer_Preburner", "target": "Main_Injector"},
        {"source": "Main_Injector", "target": "Main_Combustion_Chamber"},
        {"source": "Main_Combustion_Chamber", "target": "Nozzle_Throat"},
        {"source": "Nozzle_Throat", "target": "Nozzle_Extension"},

        # Powerhead and control
        {"source": "Powerhead", "target": "HPOTP"},
        {"source": "Controller_MEC", "target": "Powerhead"},

        # Fuel system
        {"source": "Fuel_Coolant_Valve_A", "target": "Main_Combustion_Chamber"},
        {"source": "LOX_Supply_Line", "target": "Main_Injector"},

        # Sensors monitoring temperature
        {"source": "Temp_Sensor_A", "target": "Main_Combustion_Chamber"},
        {"source": "Temp_Sensor_B", "target": "Nozzle_Throat"},
        {"source": "Temp_Sensor_C", "target": "Oxidizer_Preburner"},
        {"source": "Temp_Sensor_Pass_A", "target": "HPOTP"},
        {"source": "Temp_Sensor_Pass_B", "target": "LPOTP"},
        {"source": "Temp_Sensor_Pass_C", "target": "Fuel_Coolant_Valve_A"},

        # Support systems
        {"source": "Helium_Control_System", "target": "OPOV"},
        {"source": "OPOV", "target": "Oxidizer_Preburner"},
        {"source": "Press_Reg_C", "target": "Helium_Control_System"},
        {"source": "Bleed_Valve", "target": "HPOTP_Discharge"},
        {"source": "Vibration_Suppressor_B", "target": "LOX_Supply_Line"},
        {"source": "Hot_Gas_Manifold", "target": "Oxidizer_Preburner"},
        {"source": "Gimbal_Actuator", "target": "Nozzle_Extension"},
        {"source": "Hydraulic_Power_Unit", "target": "Gimbal_Actuator"},
        {"source": "Engine_Mount", "target": "External_Interface"},
        {"source": "External_Interface", "target": "Controller_MEC"},
    ]

    return relationships


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
