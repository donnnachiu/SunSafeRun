import json
import urllib.request
import ssl

# Updated HK Government CSDI Portal API Endpoints
DATASETS = {
    "LCSD_WATER": "https://api.csdi.gov.hk/apiproxy/geospatial/rest/services/lcsd/lcsd_drinking_fountains/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson",
    "FEHD_TOILETS": "https://api.csdi.gov.hk/apiproxy/geospatial/rest/services/fehd/fehd_public_toilets/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson",
    "FSD_AED": "https://api.csdi.gov.hk/apiproxy/geospatial/rest/services/fsd/fsd_aed_locations/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson"
}

# Core HK runner POIs fallback
FALLBACK_POIS = [
    {
        "id": "gov-water-wk-1",
        "name": "WestK Art Park Drinking Fountain",
        "lat": 22.3008,
        "lng": 114.1558,
        "category": "drinking_water",
        "icon": "💧",
        "color": "#0284C7",
        "address": "Art Park Promenade, West Kowloon"
    },
    {
        "id": "gov-water-wk-2",
        "name": "M+ Museum Water Station",
        "lat": 22.3019,
        "lng": 114.1585,
        "category": "drinking_water",
        "icon": "💧",
        "color": "#0284C7",
        "address": "M+ Cultural District"
    },
    {
        "id": "gov-toilet-wk-1",
        "name": "Freespace Public Restroom",
        "lat": 22.3012,
        "lng": 114.1571,
        "category": "restroom",
        "icon": "🚽",
        "color": "#10B981",
        "address": "Freespace, WestK"
    },
    {
        "id": "gov-ac-wk-1",
        "name": "West Kowloon Cultural Centre (Indoor AirCon)",
        "lat": 22.3025,
        "lng": 114.1601,
        "category": "ac_rest",
        "icon": "❄️",
        "color": "#3B82F6",
        "address": "Austin Road West"
    },
    {
        "id": "gov-shop-wk-1",
        "name": "7-Eleven Kowloon Station",
        "lat": 22.3048,
        "lng": 114.1612,
        "category": "convenience",
        "icon": "🥤",
        "color": "#0891B2",
        "address": "Elements Mall / MTR Station"
    },
    {
        "id": "gov-aed-wk-1",
        "name": "Xiqu Centre First Aid / AED",
        "lat": 22.3031,
        "lng": 114.1678,
        "category": "aed",
        "icon": "🚨",
        "color": "#EF4444",
        "address": "88 Austin Road West"
    },
    {
        "id": "gov-water-tst-1",
        "name": "Avenue of Stars Water Dispenser",
        "lat": 22.2931,
        "lng": 114.1738,
        "category": "drinking_water",
        "icon": "💧",
        "color": "#0284C7",
        "address": "Tsim Sha Tsui Waterfront Promenade"
    },
    {
        "id": "gov-shop-tst-1",
        "name": "Circle K Star Ferry Pier",
        "lat": 22.2938,
        "lng": 114.1685,
        "category": "convenience",
        "icon": "🥤",
        "color": "#0891B2",
        "address": "TST Star Ferry Terminal"
    },
    {
        "id": "gov-water-central-1",
        "name": "Central Pier 9 Drinking Fountain",
        "lat": 22.2871,
        "lng": 114.1618,
        "category": "drinking_water",
        "icon": "💧",
        "color": "#0284C7",
        "address": "Central Harbourfront Promenade"
    },
    {
        "id": "gov-toilet-central-1",
        "name": "Central Harbourfront Public Toilets",
        "lat": 22.2863,
        "lng": 114.1635,
        "category": "restroom",
        "icon": "🚽",
        "color": "#10B981",
        "address": "Central Event Space"
    },
    {
        "id": "gov-water-vicpark-1",
        "name": "Victoria Park Running Track Water Station",
        "lat": 22.2818,
        "lng": 114.1885,
        "category": "drinking_water",
        "icon": "💧",
        "color": "#0284C7",
        "address": "Causeway Bay, Victoria Park"
    },
    {
        "id": "gov-ac-vicpark-1",
        "name": "Victoria Park Sports Centre (AirCon)",
        "lat": 22.2825,
        "lng": 114.1892,
        "category": "ac_rest",
        "icon": "❄️",
        "color": "#3B82F6",
        "address": "1 Hing Fat Street, Causeway Bay"
    },
    {
        "id": "gov-toilet-vicpark-1",
        "name": "Victoria Park Swimming Pool Restroom",
        "lat": 22.2812,
        "lng": 114.1901,
        "category": "restroom",
        "icon": "🚽",
        "color": "#10B981",
        "address": "Hing Fat Street"
    },
    {
        "id": "gov-water-shatin-1",
        "name": "Shing Mun River Promenade Water Fountain",
        "lat": 22.3821,
        "lng": 114.1895,
        "category": "drinking_water",
        "icon": "💧",
        "color": "#0284C7",
        "address": "Shatin Sports Ground Side"
    }
]

output_pois = []

def fetch_json(url):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
    )
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))

def download_and_process():
    # 1. LCSD Water Fountains
    try:
        data = fetch_json(DATASETS["LCSD_WATER"])
        for idx, feat in enumerate(data.get("features", [])):
            coords = feat["geometry"]["coordinates"]
            props = feat.get("properties", {})
            output_pois.append({
                "id": f"gov-water-{idx}",
                "name": props.get("Facility_Name_en") or props.get("Name_en") or "Public Drinking Fountain",
                "lat": coords[1],
                "lng": coords[0],
                "category": "drinking_water",
                "icon": "💧",
                "color": "#0284C7",
                "address": props.get("Address_en", "Hong Kong")
            })
        print(f"Added {len(output_pois)} water fountains from LCSD.")
    except Exception as e:
        print("LCSD fetch note:", e)

    # 2. FEHD Toilets
    try:
        data = fetch_json(DATASETS["FEHD_TOILETS"])
        toilet_count = 0
        for idx, feat in enumerate(data.get("features", [])):
            coords = feat["geometry"]["coordinates"]
            props = feat.get("properties", {})
            output_pois.append({
                "id": f"gov-toilet-{idx}",
                "name": props.get("Name_en") or "Public Restroom",
                "lat": coords[1],
                "lng": coords[0],
                "category": "restroom",
                "icon": "🚽",
                "color": "#10B981",
                "address": props.get("Address_en", "Hong Kong")
            })
            toilet_count += 1
        print(f"Added {toilet_count} toilets from FEHD.")
    except Exception as e:
        print("FEHD fetch note:", e)

    # Fallback if network/DNS prevents live API fetching
    if len(output_pois) == 0:
        print("Using built-in HK runner POI dataset fallback.")
        output_pois.extend(FALLBACK_POIS)

    with open("src/data/staticPois.json", "w", encoding="utf-8") as f:
        json.dump(output_pois, f, ensure_ascii=False, indent=2)

    print(f"Successfully generated src/data/staticPois.json with {len(output_pois)} POIs!")

if __name__ == "__main__":
    download_and_process()
