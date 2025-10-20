export interface UserToCreate {
  first_name: string;
  last_name?: string;
  email: string;
  isActive: boolean;
} // toCreateOwnerUser

interface Service {
  id: number;
  branch_id: number;
  name: string;
  default_duration: number;
  prices: { price: number; duration: number }[];
  description: string | null;
  category: string | null;
  age_restriction: string | null;
  recommendations: string | null;
  group: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  first_name: string;
  last_name?: string | null;
  role: "manager" | "employee";
}

export interface ServiceInfo {
  id?: number;
  name: string;
  price: number;
  duration: number;
}

export interface ClientInfo {
  first_name: string;
  last_name?: string | null;
  phone: string;
}

export interface OrganizationInfo {
  id: number;
  branches: { id: number; name: string }[];
}
