// src/services/poiService.js
import staticPois from '../data/staticPois.json';
import { POI_CATEGORIES } from '../constants/poiCategories';

export function fetchRunnerPOIs() {
    const features = Array.isArray(staticPois)
        ? staticPois
        : (staticPois?.features || []);

    return features
        .map((feature, index) => {
            /** @type {Record<string, any>} */
            const props = feature.properties || {};
            const coords = feature.geometry?.coordinates || [0, 0];

            const longitude = props.LONGITUDE ?? coords[0] ?? 0;
            const latitude = props.LATITUDE ?? coords[1] ?? 0;

            const datasetEn = String(props.DATASET_EN || '').toLowerCase();
            const search02En = String(props.SEARCH02_EN || '').toLowerCase();
            const poiTypeEn = String(props.POI_TYPE_EN || '').toLowerCase();

            // Explicitly check for water categories
            const isWater =
                poiTypeEn.includes('water') ||
                datasetEn.includes('water');

            // Explicitly check for restroom / toilet categories
            const isRestroom =
                search02En.includes('restroom') ||
                search02En.includes('toilet') ||
                datasetEn.includes('restroom') ||
                datasetEn.includes('toilet') ||
                poiTypeEn.includes('restroom') ||
                poiTypeEn.includes('toilet');

            // If it's neither water nor restroom, you can either skip it or assign a null category so it won't match toggles
            let category = null;
            if (isWater) {
                category = POI_CATEGORIES.WATER.id;
            } else if (isRestroom) {
                category = POI_CATEGORIES.RESTROOM.id;
            } else {
                return null; // Ignore non-water/non-restroom items so they don't pollute the map
            }

            return {
                id: `poi-${props.OBJECTID || index}`,
                lat: parseFloat(latitude),
                lng: parseFloat(longitude),
                category,
                icon: isWater ? POI_CATEGORIES.WATER.icon : POI_CATEGORIES.RESTROOM.icon,
                color: isWater ? POI_CATEGORIES.WATER.markerColor : POI_CATEGORIES.RESTROOM.markerColor,
                nameTC: props.NAME_TC || (isWater ? '飲水機' : '公廁'),
                nameEN: props.NAME_EN || (isWater ? 'Water Dispenser' : 'Public Restroom'),
                addressTC: props.ADDRESS_TC || '',
                addressEN: props.ADDRESS_EN || '',
            };
        })
        .filter(Boolean); // Filter out any null items
}