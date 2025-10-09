const DB_NAME = "kios-pos-mock";
const STORE_NAME = "state";
const KEY = "db";

export type MockOutlet = {
  id: string;
  name: string;
  code: string;
  address?: string;
};

export type MockProduct = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  price: number;
  category?: string;
  promoName?: string;
  promoPrice?: number;
  isTaxable?: boolean;
  taxRate?: number;
};

export type MockPayment = {
  method: string;
  amount: number;
  reference?: string;
};

export type MockSaleItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  taxable?: boolean;
};

export type MockSale = {
  id: string;
  receiptNumber: string;
  outletId: string;
  soldAt: string;
  totalGross: number;
  discountTotal: number;
  taxAmount: number;
  totalNet: number;
  items: MockSaleItem[];
  payments: MockPayment[];
};

export type MockTaxSetting = {
  id: string;
  name: string;
  rate: number;
  isActive: boolean;
};

export type MockDatabase = {
  outlets: MockOutlet[];
  products: MockProduct[];
  sales: MockSale[];
  taxSettings: MockTaxSetting[];
};

const clone = <T>(value: T): T =>
  typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

const seedData: MockDatabase = {
  outlets: [
    {
      id: "outlet-1",
      name: "Kios Pusat",
      code: "MAIN",
      address: "Jl. Raya No. 12, Jakarta",
    },
    {
      id: "outlet-2",
      name: "Kios Cabang",
      code: "BR01",
      address: "Jl. Melati No. 5, Bandung",
    },
  ],
  products: [
    {
      id: "prod-1",
      name: "Kopi Susu Botol",
      sku: "KSB-001",
      barcode: "1234567890123",
      price: 18000,
      promoName: "Paket Hemat",
      promoPrice: 15000,
      isTaxable: true,
      taxRate: 11,
    },
    {
      id: "prod-2",
      name: "Roti Tawar Gandum",
      sku: "RTG-002",
      barcode: "2345678901234",
      price: 24000,
    },
    {
      id: "prod-3",
      name: "Air Mineral 600ml",
      sku: "AMN-003",
      barcode: "3456789012345",
      price: 6000,
    },
  ],
  sales: [],
  taxSettings: [
    {
      id: "tax-1",
      name: "PPN 11%",
      rate: 11,
      isActive: true,
    },
  ],
};

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });

export const readMockDb = async (): Promise<MockDatabase> => {
  const db = await openDatabase();
  try {
    return await new Promise<MockDatabase>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const value = request.result as MockDatabase | undefined;
        resolve(value ?? clone(seedData));
      };
    });
  } finally {
    db.close();
  }
};

export const writeMockDb = async (payload: MockDatabase) => {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(payload, KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } finally {
    db.close();
  }
};

export const ensureSeeded = async () => {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(KEY);
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        if (!getRequest.result) {
          store.put(clone(seedData), KEY);
        }
        resolve();
      };
    });
  } finally {
    db.close();
  }
};

export const resetMockDb = async () => writeMockDb(clone(seedData));
