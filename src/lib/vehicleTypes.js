export const VEHICLE_TYPE_OPTIONS = [
  "Truck - 6 Wheels",
  "Truck - 10 Wheels", 
  "Truck - 14 Wheels",
  "Container",
  "Trailer",
  "Pickup",
  "Van",
  "Bus",
  "Car",
  "Other"
];

export const vehicleTypeKey = name => name.trim().replace(/\s+/g, " ").toLowerCase();
