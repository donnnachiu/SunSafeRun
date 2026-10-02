// src/services/poiService.js
import staticPois from '../data/staticPois.json';
import { POI_CATEGORIES } from '../constants/poiCategories';

export function fetchRunnerPOIs() {
    const features = Array.isArray(staticPois)
        ? staticPois
        : (staticPois?.features || []);

    return features.map((feature, index) => {
        /** @type {Record<string, any>} */
        const props = feature.properties || {};
        const coords = feature.geometry?.coordinates || [0, 0];

        const longitude = props.LONGITUDE ?? coords[0] ?? 0;
        const latitude = props.LATITUDE ?? coords[1] ?? 0;

        const datasetEn = String(props.DATASET_EN || '');
        const search02En = String(props.SEARCH02_EN || '');
        const poiTypeEn = String(props.POI_TYPE_EN || ''); // Added to catch type-based fields

        // Expanded check to include POI_TYPE_EN and catch various formats
        const isWater =
            search02En.toLowerCase().includes('water') ||
            datasetEn.toLowerCase().includes('water') ||
            poiTypeEn.toLowerCase().includes('water');

        return {
            id: `poi-${props.OBJECTID || index}`,
            lat: parseFloat(latitude),
            lng: parseFloat(longitude),
            category: isWater ? POI_CATEGORIES.WATER.id : POI_CATEGORIES.RESTROOM.id,
            icon: isWater ? POI_CATEGORIES.WATER.icon : POI_CATEGORIES.RESTROOM.icon,
            color: isWater ? POI_CATEGORIES.WATER.markerColor : POI_CATEGORIES.RESTROOM.markerColor,
            nameTC: props.NAME_TC || (isWater ? '飲水機' : '公廁'),
            nameEN: props.NAME_EN || (isWater ? 'Water Dispenser' : 'Public Restroom'),
            addressTC: props.ADDRESS_TC || '',
            addressEN: props.ADDRESS_EN || '',
        };
    });
}