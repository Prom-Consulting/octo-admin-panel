import type { AssignmentPaidMethod } from "./modules/assignments/Assignment.ts";

export interface UserToCreate {
  firstname: string;
  lastname?: string;
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
  role: string;
}

export interface UserInfo extends Employee {
  id: number;
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
  name: string;
}

export interface PaymentPart {
  type: AssignmentPaidMethod;
  amount: number;
  name: string;
}

export interface PaymentMethod {
  methods: PaymentPart[];
  total: number;
}

export interface CertificateInfo {
  certificate_number: string;
  amount: number;
  discount: number;
  expiry_date: Date;
}

export interface UserToken {
  id: number;
  first_name: string;
  last_name?: string;
  email: string;
  role: string;
  organizationId?: number;
  organizationName?: string;
}