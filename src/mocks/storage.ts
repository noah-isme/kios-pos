const DB_NAME = "kios-pos-mock";
const STORE_NAME = "state";
const KEY = "db";
const CURRENT_SEED_REVISION = 2;

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
  seedRevision?: number;
};

const clone = <T>(value: T): T =>
  typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

const seedSaleTimestampA = new Date("2024-11-10T09:00:00.000Z").toISOString();
const seedSaleTimestampB = new Date("2024-11-09T16:30:00.000Z").toISOString();
const seedSaleTimestampC = new Date("2024-11-08T13:15:00.000Z").toISOString();

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
  sales: [
    {
      id: "sale-demo-1",
      receiptNumber: "TRX-001",
      outletId: "outlet-1",
      soldAt: seedSaleTimestampA,
      totalGross: 42000,
      discountTotal: 3000,
      taxAmount: 0,
      totalNet: 39000,
      items: [
        {
          id: "sale-demo-1-item-1",
          productId: "prod-1",
          productName: "Kopi Susu Botol",
          quantity: 1,
          unitPrice: 18000,
          discount: 3000,
          total: 15000,
          taxable: true,
        },
        {
          id: "sale-demo-1-item-2",
          productId: "prod-2",
          productName: "Roti Tawar Gandum",
          quantity: 1,
          unitPrice: 24000,
          discount: 0,
          total: 24000,
          taxable: false,
        },
      ],
      payments: [
        { method: "CASH", amount: 20000 },
        { method: "QRIS", amount: 19000, reference: "QR-123" },
      ],
    },
    {
      id: "sale-demo-2",
      receiptNumber: "TRX-002",
      outletId: "outlet-2",
      soldAt: seedSaleTimestampB,
      totalGross: 36000,
      discountTotal: 0,
      taxAmount: 0,
      totalNet: 36000,
      items: [
        {
          id: "sale-demo-2-item-1",
          productId: "prod-3",
          productName: "Air Mineral 600ml",
          quantity: 3,
          unitPrice: 6000,
          discount: 0,
          total: 18000,
          taxable: false,
        },
        {
          id: "sale-demo-2-item-2",
          productId: "prod-1",
          productName: "Kopi Susu Botol",
          quantity: 1,
          unitPrice: 18000,
          discount: 0,
          total: 18000,
          taxable: true,
        },
      ],
      payments: [{ method: "CARD", amount: 36000, reference: "CARD-001" }],
    },
    {
      id: "sale-demo-3",
      receiptNumber: "TRX-003",
      outletId: "outlet-1",
      soldAt: seedSaleTimestampC,
      totalGross: 60000,
      discountTotal: 4000,
      taxAmount: 0,
      totalNet: 56000,
      items: [
        {
          id: "sale-demo-3-item-1",
          productId: "prod-2",
          productName: "Roti Tawar Gandum",
          quantity: 2,
          unitPrice: 24000,
          discount: 4000,
          total: 44000,
          taxable: false,
        },
        {
          id: "sale-demo-3-item-2",
          productId: "prod-3",
          productName: "Air Mineral 600ml",
          quantity: 2,
          unitPrice: 6000,
          discount: 0,
          total: 12000,
          taxable: false,
        },
      ],
      payments: [
        { method: "EWALLET", amount: 30000, reference: "EW-882" },
        { method: "CASH", amount: 26000 },
      ],
    },
  ],
  taxSettings: [
    {
      id: "tax-1",
      name: "PPN 11%",
      rate: 11,
      isActive: true,
    },
  ],
  seedRevision: CURRENT_SEED_REVISION,
};

const cloneSeed = () => clone(seedData);

const upgradeDbIfNeeded = (database: MockDatabase | undefined) => {
  if (!database) {
    return { data: cloneSeed(), changed: true };
  }

  const next = clone(database);
  let changed = false;

  if (!next.outlets || next.outlets.length === 0) {
    next.outlets = clone(seedData.outlets);
    changed = true;
  }

  if (!next.products || next.products.length === 0) {
    next.products = clone(seedData.products);
    changed = true;
  }

  if (!next.taxSettings || next.taxSettings.length === 0) {
    next.taxSettings = clone(seedData.taxSettings);
    changed = true;
  }

  const currentRevision = next.seedRevision ?? 0;
  if (currentRevision < CURRENT_SEED_REVISION) {
    if (!next.sales || next.sales.length === 0) {
      next.sales = clone(seedData.sales);
    }
    next.seedRevision = CURRENT_SEED_REVISION;
    changed = true;
  } else if (!next.sales) {
    next.sales = [];
    changed = true;
  }

  return { data: next, changed };
};

const prepareForWrite = (database: MockDatabase) => {
  const next = clone(database);
  next.seedRevision = CURRENT_SEED_REVISION;
  return next;
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
        const { data } = upgradeDbIfNeeded(value);
        resolve(data);
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
      const request = store.put(prepareForWrite(payload), KEY);
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
        const current = getRequest.result as MockDatabase | undefined;
        const { data, changed } = upgradeDbIfNeeded(current);
        if (changed) {
          store.put(prepareForWrite(data), KEY);
        }
        resolve();
      };
    });
  } finally {
    db.close();
  }
};

export const resetMockDb = async () => writeMockDb(cloneSeed());
