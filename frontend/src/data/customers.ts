export interface Customer {
  id: string;
  name: string;
  email: string;
  mobile: string;
  location: string;
  joinedDate: string;
  ordersCount: number;
  status: "active" | "blocked";
}

export const customers: Customer[] = [
  { id: "cust-1", name: "Anita Reddy", email: "anita@example.com", mobile: "9876543210", location: "Hyderabad, Telangana", joinedDate: "2026-01-12", ordersCount: 4, status: "active" },
  { id: "cust-2", name: "Rajesh Kumar", email: "rajesh.k@example.com", mobile: "9123456780", location: "Vijayawada, AP", joinedDate: "2026-02-03", ordersCount: 2, status: "active" },
  { id: "cust-3", name: "Priya Sharma", email: "priya.sharma@example.com", mobile: "9988776655", location: "Warangal, Telangana", joinedDate: "2026-02-20", ordersCount: 6, status: "active" },
  { id: "cust-4", name: "Suresh Babu", email: "suresh.babu@example.com", mobile: "9012345678", location: "Guntur, AP", joinedDate: "2026-03-15", ordersCount: 1, status: "active" },
  { id: "cust-5", name: "Kavitha Rao", email: "kavitha.rao@example.com", mobile: "9765432109", location: "Karimnagar, Telangana", joinedDate: "2026-04-01", ordersCount: 3, status: "blocked" },
  { id: "cust-6", name: "Mahesh Varma", email: "mahesh.varma@example.com", mobile: "9345678123", location: "Nellore, AP", joinedDate: "2026-05-08", ordersCount: 5, status: "active" },
];
