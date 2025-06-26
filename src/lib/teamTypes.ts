
export interface TeamMember {
  id: string;
  providerId: string;
  name: string;
  cedula: string;
  phone: string;
  photoUrl?: string;
  criminalRecordFileUrl?: string;
  role: 'lider' | 'auxiliar';
  positionOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMemberFormData {
  name: string;
  cedula: string;
  phone: string;
  photoUrl?: string;
  criminalRecordFileUrl?: string;
}
