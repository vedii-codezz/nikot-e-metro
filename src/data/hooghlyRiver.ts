/**
 * Simplified Hooghly River polygon geometry for Kolkata cartography.
 * Anchors the city transit geography (Howrah on the West bank, Kolkata Central/North/South on the East bank).
 */
export const HOOGHLY_RIVER_GEOJSON = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: {
        name: "Hooghly River",
        bengaliName: "হুগলী নদী",
        class: "waterway",
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            // Northern stretch near Dakshineswar / Bally Bridge
            [88.3550, 22.6650],
            [88.3580, 22.6550],
            [88.3610, 22.6350],
            [88.3620, 22.6150],
            [88.3590, 22.5950],
            // Central stretch near Howrah Station / Underwater Metro Tunnel / Babughat
            [88.3510, 22.5850],
            [88.3420, 22.5760],
            [88.3370, 22.5680],
            [88.3310, 22.5580],
            // Southern stretch near Vidyasagar Setu (2nd Hooghly Bridge) / Kidderpore docks
            [88.3240, 22.5480],
            [88.3180, 22.5350],
            [88.3120, 22.5200],
            [88.3050, 22.5050],
            // West bank (Howrah & Shibpur side)
            [88.2980, 22.5080],
            [88.3050, 22.5230],
            [88.3110, 22.5380],
            [88.3160, 22.5510],
            [88.3240, 22.5620],
            [88.3310, 22.5710],
            [88.3370, 22.5790],
            [88.3440, 22.5890],
            [88.3490, 22.6020],
            [88.3520, 22.6200],
            [88.3510, 22.6400],
            [88.3470, 22.6580],
            [88.3550, 22.6650],
          ],
        ],
      },
    },
  ],
};
