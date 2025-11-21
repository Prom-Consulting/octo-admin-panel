import type { AssignmentPaidMethod } from "./modules/assignments/models/Assignment.ts";

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
  phone_number: string;
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

export const PAYMENT_STATUS = ["success", "refund"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

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

export interface OrganizationCreate {
  name: string;
  user_id: number;
  branches: number;
  paidDate: Date;
  isActive: boolean;
}

export interface ClientActivity {
  id: number;
  client_source_id: string;
  client_snapshot: ClientInfoAttributes;
  branch_id: number;
  main_service: ServiceInfo;
  additional_services?: ServiceInfo[];
  paid_status: PaymentStatus | null;
  status: AssignmentStatus;
  total_price: number;
  // activity_hash: string;
  date: Date;
  timezone: string;
  createdAt?: Date;
  updatedAt?: Date;
}