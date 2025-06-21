export interface Doctor {
  name: string;
  type: 'MMG' | 'PLS';
  address: string;
  contacts: {
    phone?: string;
    email?: string;
  };
  city: string;
  area: string;
  schedule?: string;
  availability: 'available' | 'full' | 'limited';
  association?: string;
  group?: string;
  network?: string;
}