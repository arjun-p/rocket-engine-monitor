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

        # Return full component details
        return [
            {
                "id": item[0],
                "symptomCode": item[1] if item[1] else None,
                "isObservable": item[2],
                "status": item[3],
                "relatedSymptom": item[4] if item[4] else None,
                "team": item[5]
            }
            for item in result_set["component"]
        ]

    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Prometheux API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching components: {str(e)}")


@app.get("/relationships", tags=["Components"])
async def get_relationships():
    """
    Get component dependency relationships (parent → child) from Vadalog
    Returns array of {source, target} pairs
    """
    if not PMTX_TOKEN:
        raise HTTPException(status_code=500, detail="Prometheux token not configured")

    # Get S3 credentials from environment
    s3_access_key = os.getenv("AWS_ACCESS_KEY_ID")
    s3_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    s3_bucket = os.getenv("S3_BUCKET", "prometheux-public-data-bucket")

    if not s3_access_key or not s3_secret_key:
        raise HTTPException(status_code=500, detail="S3 credentials not configured")

    # Load Vadalog program from file
    vadalog_file = os.path.join(os.path.dirname(__file__), "vadalog", "get_relationships.vada")
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
        if "relationship" not in result_set:
            raise HTTPException(status_code=500, detail=f"No relationship data in results: {data}")

        # Transform to {source, target} format
        return [
            {"source": item[0], "target": item[1]}
            for item in result_set["relationship"]
        ]

    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Prometheux API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching relationships: {str(e)}")


@app.get("/degree-centrality", tags=["Graph Analytics"])
async def get_degree_centrality():
    """
    Calculate degree centrality for all components in the dependency graph
    Returns: in_degree, out_degree, and total_degree for each component
    """
    if not PMTX_TOKEN:
        raise HTTPException(status_code=500, detail="Prometheux token not configured")

    # Get S3 credentials from environment
    s3_access_key = os.getenv("AWS_ACCESS_KEY_ID")
    s3_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    s3_bucket = os.getenv("S3_BUCKET", "prometheux-public-data-bucket")

    if not s3_access_key or not s3_secret_key:
        raise HTTPException(status_code=500, detail="S3 credentials not configured")

    # Load Vadalog program from file
    vadalog_file = os.path.join(os.path.dirname(__file__), "vadalog", "degree_centrality.vada")
    with open(vadalog_file, "r") as f:
        vadalog_template = f.read()

    # Replace template variables
    vadalog_program = vadalog_template.format(
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
        if "degree_centrality" not in result_set:
            raise HTTPException(status_code=500, detail=f"No degree_centrality data in results: {data}")

        # Format results
        # Vadalog returns: [Node, Degree, NormalizedCentrality]
        nodes = [
            {
                "component_id": item[0],
                "degree": item[1],  # Raw number of connections
                "centrality": round(item[2], 4),  # Normalized 0-1
                "centrality_percent": round(item[2] * 100, 2),  # Percentage
                "rank": idx + 1  # Position in sorted list
            }
            for idx, item in enumerate(result_set["degree_centrality"])
        ]

        # Calculate metadata
        total_nodes = len(nodes)
        average_degree = sum(n["degree"] for n in nodes) / total_nodes if total_nodes > 0 else 0
        average_centrality = sum(n["centrality"] for n in nodes) / total_nodes if total_nodes > 0 else 0
        most_central = max(nodes, key=lambda x: x["centrality"]) if nodes else None

        return {
            "nodes": nodes,  # Already sorted by @post annotation in Vadalog
            "metadata": {
                "total_nodes": total_nodes,
                "total_edges": sum(n["degree"] for n in nodes) // 2,  # Undirected graph
                "average_degree": round(average_degree, 2),
                "average_centrality": round(average_centrality, 4),
                "most_central_component": most_central["component_id"] if most_central else None,
                "max_degree": most_central["degree"] if most_central else 0,
                "max_centrality": most_central["centrality"] if most_central else 0
            }
        }

    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Prometheux API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating degree centrality: {str(e)}")


@app.get("/failure-analysis", tags=["Analysis"])
async def get_failure_analysis():
    """
    Get complete 4-stage failure analysis from Vadalog
    Returns: stage1 (failed sensors), stage2 (failure chains), stage3 (hotspots), stage4 (alerts)
    """
    if not PMTX_TOKEN:
        raise HTTPException(status_code=500, detail="Prometheux token not configured")

    # Get S3 credentials
    s3_access_key = os.getenv("AWS_ACCESS_KEY_ID")
    s3_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    s3_bucket = os.getenv("S3_BUCKET", "prometheux-public-data-bucket")

    # Construct PostgreSQL JDBC URL
    psql_host = os.getenv("POSTGRES_HOST", "localhost")
    psql_port = os.getenv("POSTGRES_PORT", "5432")
    psql_db = os.getenv("POSTGRES_DB", "prometheux")
    psql_user = os.getenv("POSTGRES_USER", "postgres")
    psql_password = os.getenv("POSTGRES_PASSWORD", "")
    psql_url = f"jdbc:postgresql://{psql_host}:{psql_port}/{psql_db}"

    # Construct MariaDB JDBC URL
    maria_host = os.getenv("MARIADB_HOST", "localhost")
    maria_port = os.getenv("MARIADB_PORT", "3306")
    maria_db = os.getenv("MARIADB_DB", "prometheux")
    maria_user = os.getenv("MARIADB_USER", "root")
    maria_password = os.getenv("MARIADB_PASSWORD", "")
    maria_url = f"jdbc:mariadb://{maria_host}:{maria_port}/{maria_db}"

    # Construct Neo4j Bolt URL
    neo4j_host = os.getenv("NEO4J_HOST", "localhost")
    neo4j_port = os.getenv("NEO4J_PORT", "7687")
    neo4j_user = os.getenv("NEO4J_USER", "neo4j")
    neo4j_password = os.getenv("NEO4J_PASSWORD", "")
    neo4j_url = f"bolt://{neo4j_host}:{neo4j_port}"

    if not s3_access_key or not s3_secret_key:
        raise HTTPException(status_code=500, detail="S3 credentials not configured")

    # Load Vadalog program from file (full version with database integration)
    vadalog_file = os.path.join(os.path.dirname(__file__), "vadalog", "failure_analysis.vada")
    with open(vadalog_file, "r") as f:
        vadalog_template = f.read()

    # Replace template variables
    vadalog_program = vadalog_template.format(
        s3_access_key=s3_access_key,
        s3_secret_key=s3_secret_key,
        s3_bucket=s3_bucket,
        psql_host=psql_host,
        psql_port=psql_port,
        psql_db=psql_db,
        psql_user=psql_user,
        psql_password=psql_password,
        maria_host=maria_host,
        maria_port=maria_port,
        maria_db=maria_db,
        maria_user=maria_user,
        maria_password=maria_password,
        neo4j_host=neo4j_host,
        neo4j_port=neo4j_port,
        neo4j_db=os.getenv("NEO4J_DB", "neo4j"),
        neo4j_user=neo4j_user,
        neo4j_password=neo4j_password
    )

    # Debug: Print first 1500 chars of Vadalog program
    print(f"📝 Vadalog Program Preview:\n{vadalog_program[:1500]}...")

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

        # Stage 1: Failed Sensors (from failed_observable query)
        failed_sensors = set()
        if "failed_observable" in result_set:
            for item in result_set["failed_observable"]:
                sensor_id = item[0]  # failed_observable returns [ComponentID]
                failed_sensors.add(sensor_id)

        # Stage 2: Failure Chains
        failure_chains = []
        if "failure_chain" in result_set:
            failure_chains = [
                {"parent": item[0], "child": item[1]}
                for item in result_set["failure_chain"]
            ]

        # Stage 3: Hotspots - use Vadalog's hotspot computation directly
        hotspots = []
        if "hotspot" in result_set:
            # Vadalog returns hotspot as [[Component, SensorCount], ...]
            # Build hotspot objects with affected sensors info from propagates_to
            hotspot_data = {}
            for item in result_set["hotspot"]:
                component = item[0]
                sensor_count = item[1]
                hotspot_data[component] = {
                    "component": component,
                    "affectedSensors": [],
                    "impactScore": sensor_count
                }

            # Populate affectedSensors by tracing back from propagates_to
            if "propagates_to" in result_set:
                # Find which failed sensors propagate to each hotspot component
                for item in result_set["propagates_to"]:
                    source = item[0]
                    target = item[1]

                    # If source is a failed sensor and target is a hotspot component
                    if source in failed_sensors and target in hotspot_data:
                        if source not in hotspot_data[target]["affectedSensors"]:
                            hotspot_data[target]["affectedSensors"].append(source)

            # Find the maximum sensor count (convergence points)
            max_sensor_count = max(
                (h["impactScore"] for h in hotspot_data.values()),
                default=0
            )

            # Filter to only include components with maximum sensor impact (convergence points)
            convergence_points = [
                hotspot for hotspot in hotspot_data.values()
                if hotspot["impactScore"] == max_sensor_count
            ]

            # Sort by impact score (descending)
            hotspots = sorted(
                convergence_points,
                key=lambda x: x["impactScore"],
                reverse=True
            )

        # Parse Degree Centrality (for root cause enrichment)
        degree_centrality_map = {}
        if "degree_centrality" in result_set:
            for item in result_set["degree_centrality"]:
                component_id = item[0]
                centrality_value = item[1]
                degree_centrality_map[component_id] = centrality_value

        # Parse Root Cause - METHOD 1: Default (No Parents)
        root_cause_default = None
        if "rootcause_default" in result_set and result_set["rootcause_default"]:
            component = result_set["rootcause_default"][0][0]
            if component in hotspot_data:
                root_cause_default = hotspot_data[component].copy()

        # Parse Root Cause - METHOD 2: Combined (Convergence + In-Degree)
        root_cause_combined = None
        if "rootcause_combined" in result_set and result_set["rootcause_combined"]:
            item = result_set["rootcause_combined"][0]
            component = item[0]
            sensor_count = item[1]
            indegree = item[2]

            if component in hotspot_data:
                root_cause_combined = hotspot_data[component].copy()
                root_cause_combined["centrality"] = indegree
                root_cause_combined["method"] = "combined"

        # Backward compatibility: default method
        root_cause = root_cause_default

        # Stage 4: Alerts (Component, Team, LeaderID, FirstName, LastName, SensorCount)
        alerts = []
        if "alert" in result_set:
            alerts = [
                {
                    "component": item[0],
                    "team": item[1],
                    "teamLeaderId": item[2],
                    "firstName": item[3],
                    "lastName": item[4],
                    "sensorCount": item[5] if len(item) > 5 else 0
                }
                for item in result_set["alert"]
            ]

        # Debug: Print what we got from Vadalog
        print(f"🔍 Vadalog Results:")
        print(f"  - failed_observable: {len(result_set.get('failed_observable', []))}")
        print(f"  - failure_chain: {len(result_set.get('failure_chain', []))}")
        print(f"  - propagates_to: {len(result_set.get('propagates_to', []))}")
        print(f"  - hotspot: {len(result_set.get('hotspot', []))} - {result_set.get('hotspot', [])[:3]}")
        print(f"  - team_leader: {len(result_set.get('team_leader', []))} - {result_set.get('team_leader', [])}")
        print(f"  - alert: {len(result_set.get('alert', []))}")

        # Debug: Check component data for hotspots
        if "component" in result_set:
            print(f"  - component records: {len(result_set.get('component', []))}")
            # Find components that are hotspots
            hotspot_components = {h[0] for h in result_set.get('hotspot', [])}
            for comp in result_set.get('component', []):
                if comp[0] in hotspot_components:
                    print(f"    Hotspot component: {comp[0]} -> Team: {comp[5] if len(comp) > 5 else 'N/A'}")

        return {
            "stage1": {
                "failedSensors": sorted(list(failed_sensors))
            },
            "stage2": {
                "failureChains": failure_chains
            },
            "stage3": {
                "hotspots": hotspots,
                "rootCause": root_cause,  # Backward compatibility
                "rootCauseMethods": {
                    "default": root_cause_default,
                    "combined": root_cause_combined
                },
                "degreeCentrality": degree_centrality_map
            },
            "stage4": {
                "alerts": alerts
            }
        }

    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Prometheux API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching failure analysis: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
