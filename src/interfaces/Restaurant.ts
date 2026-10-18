type Restaurant = {
  _id: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  company: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
};

export type { Restaurant };