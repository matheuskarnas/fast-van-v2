export interface User {
  id: string;
  name: string;
  email: string;
  cpf: string;
  role: "DRIVER" | "PASSENGER";
  createdAt: string;
  updatedAt: string;
}

export interface Driver extends User {
  cnh: string;
  birthDate: string;
  vehicle?: Vehicle;
}

export interface Passenger extends User {
  birthDate: string;
}
