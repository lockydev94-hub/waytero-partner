// ============================================================
// WAYTERO PARTNER PORTAL — VEHICLE SERVICE
// Endpoints: /vehicles/* + /admin/settings/upload-media
// ============================================================
import apiClient from "./api";

// ── Types ───────────────────────────────────────────────────

export interface VehicleCategory {
  id: number;
  category_name: string;
  seating_capacity: number | null;
  luggage_capacity: number | null;
  is_active: boolean;
}

export interface VehicleDocument {
  id: number;
  document_type: string | null;
  file_url: string | null;
  expiry_date: string | null;
  verification_status: string; // PENDING | APPROVED | REJECTED
  uploaded_at: string;
  verified_at: string | null;
}

export interface VehiclePhoto {
  id: number;
  photo_type: string;   // FRONT|BACK|LEFT|RIGHT|INTERIOR|ODOMETER|ENGINE|OTHER
  file_url: string;
  caption: string | null;
  verification_status: string; // PENDING | APPROVED | REJECTED
  uploaded_at: string;
  verified_at: string | null;
  remarks: string | null;
}

export const PHOTO_TYPES = [
  { value: "FRONT",    label: "Front View" },
  { value: "BACK",     label: "Rear View" },
  { value: "LEFT",     label: "Left Side" },
  { value: "RIGHT",    label: "Right Side" },
  { value: "INTERIOR", label: "Interior" },
  { value: "ODOMETER", label: "Odometer" },
  { value: "ENGINE",   label: "Engine Bay" },
  { value: "OTHER",    label: "Other" },
] as const;

export const REQUIRED_PHOTO_TYPES = PHOTO_TYPES.map((p) => p.value);

export interface VehicleAvailability {
  availability_status: string;
  updated_at: string;
}

export interface Vehicle {
  id: number;
  uuid: string;
  partner_id: number;
  vehicle_code: string | null;
  registration_number: string;
  vehicle_category_id: number;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  manufacturing_year: number | null;
  fuel_type: string | null;
  seating_capacity: number | null;
  city_id: number;
  status: string;
  created_at: string;
  updated_at: string;
  documents: VehicleDocument[];
  photos: VehiclePhoto[];
  availability: VehicleAvailability | null;
}

export interface VehicleListItem {
  id: number;
  uuid: string;
  vehicle_code: string | null;
  registration_number: string;
  vehicle_category_id: number;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  manufacturing_year: number | null;
  fuel_type: string | null;
  seating_capacity: number | null;
  city_id: number;
  status: string;
  created_at: string;
  doc_count: number;
}

export interface VehicleListResponse {
  items: VehicleListItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface City {
  id: number;
  name: string;
  city_name: string;
  state_name?: string;
}

export interface RegisterVehiclePayload {
  registration_number: string;
  vehicle_category_id: number;
  vehicle_brand?: string;
  vehicle_model?: string;
  manufacturing_year?: number;
  fuel_type?: string;
  seating_capacity?: number;
  city_id: number;
}

export interface UploadDocumentPayload {
  document_type: string;
  file_url: string;
  expiry_date?: string | null;
}

export interface UploadPhotoPayload {
  photo_type: string;
  file_url: string;
  caption?: string;
}

// ── Service ─────────────────────────────────────────────────

export const vehicleService = {
  async getCategories(): Promise<VehicleCategory[]> {
    const { data } = await apiClient.get("/vehicles/categories");
    return data;
  },

  async getCities(): Promise<City[]> {
    const { data } = await apiClient.get("/partners/settings/master/cities");
    return (data as Array<{ id: number; name: string; state_name?: string; [k: string]: unknown }>).map((c) => ({
      ...c,
      city_name: c.name,
    }));
  },

  async listMyVehicles(
    partnerId: number,
    page = 1,
    perPage = 20
  ): Promise<VehicleListResponse> {
    const { data } = await apiClient.get(`/vehicles/partner/${partnerId}`, {
      params: { page, per_page: perPage },
    });
    return data;
  },

  async getVehicle(vehicleUuid: string): Promise<Vehicle> {
    const { data } = await apiClient.get(`/vehicles/${vehicleUuid}`);
    return data;
  },

  async registerVehicle(
    partnerId: number,
    payload: RegisterVehiclePayload
  ): Promise<Vehicle> {
    const { data } = await apiClient.post(`/vehicles`, payload, {
      params: { partner_id: partnerId },
    });
    return data;
  },

  async uploadDocument(
    vehicleUuid: string,
    partnerId: number,
    payload: UploadDocumentPayload
  ): Promise<VehicleDocument> {
    const { data } = await apiClient.post(
      `/vehicles/${vehicleUuid}/documents`,
      payload,
      { params: { partner_id: partnerId } }
    );
    return data;
  },

  async uploadPhoto(
    vehicleUuid: string,
    partnerId: number,
    payload: UploadPhotoPayload
  ): Promise<VehiclePhoto> {
    const { data } = await apiClient.post(
      `/vehicles/${vehicleUuid}/photos`,
      payload,
      { params: { partner_id: partnerId } }
    );
    return data;
  },

  async listPhotos(vehicleUuid: string): Promise<VehiclePhoto[]> {
    const { data } = await apiClient.get(`/vehicles/${vehicleUuid}/photos`);
    return data;
  },

  /**
   * Upload a file to Cloudinary via the partner-scoped upload endpoint.
   * The backend derives the partner's Cloudinary folder from the JWT
   * (waytero/partners/{partner_id}/...), so no folder_override is needed.
   * Returns the secure_url of the uploaded asset.
   */
  async uploadFile(file: File, assetType: "document" | "photo"): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("asset_type", assetType);
    const { data } = await apiClient.post("/partners/settings/upload-media", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.secure_url as string;
  },
};
