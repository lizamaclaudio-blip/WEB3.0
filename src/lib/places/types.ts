export type PlaceCategory =
  | "attraction"
  | "museum"
  | "viewpoint"
  | "historic"
  | "park"
  | "beach"
  | "peak"
  | "other";

export type NearbyPlace = {
  id: string;
  source: "osm";
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  distanceKm: number;
  tags: Record<string, string>;
  wikidataId: string | null;
  wikipedia: string | null;
  imageUrl: string | null;
  description: string | null;
  attribution: string;
};

export type NearbyPlacesResponse = {
  center: { lat: number; lng: number };
  radiusKm: number;
  places: NearbyPlace[];
};
