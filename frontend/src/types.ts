export type Product = {
  id: number;
  title: string;
  slug: string;
  description: string;
  price_paise: number;
  stock: number;
  images: string[];
  video_url?: string;
  active?: boolean;
};

export type CartLine = { product: Product; qty: number };

export type Order = {
  public_id: string;
  customer_name: string;
  phone: string;
  email: string;
  address: Record<string, string>;
  payment_mode: string;
  payment_status: string;
  total_paise: number;
  items: Array<{
    product_id: number;
    title: string;
    qty: number;
    unit_price_paise: number;
    line_total_paise: number;
  }>;
  created_at: string;
};
