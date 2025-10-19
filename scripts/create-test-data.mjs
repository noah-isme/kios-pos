#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('Creating test data...');

    // Create outlets
    const mainOutlet = await prisma.outlet.create({
      data: {
        code: 'MAIN',
        name: 'Outlet Utama',
        address: 'Jl. Merdeka No. 123, Jakarta Pusat'
      }
    });

    const bsdOutlet = await prisma.outlet.create({
      data: {
        code: 'BR2',
        name: 'Outlet Cabang BSD',
        address: 'Ruko Ruby Blok B2 No. 5, BSD City'
      }
    });

    console.log('Outlets created');

    // Create users with hashed password
    const hashedPassword = await bcrypt.hash('password', 10);

    const owner = await prisma.user.create({
      data: {
        name: 'Owner Demo',
        email: 'owner@example.com',
        role: 'OWNER',
        password: hashedPassword,
        emailVerified: new Date()
      }
    });

    const admin = await prisma.user.create({
      data: {
        name: 'Admin Demo',
        email: 'admin@example.com',
        role: 'ADMIN',
        password: hashedPassword,
        emailVerified: new Date()
      }
    });

    const cashier = await prisma.user.create({
      data: {
        name: 'Kasir Demo',
        email: 'cashier@example.com',
        role: 'CASHIER',
        password: hashedPassword
      }
    });

    console.log('Users created');

    // Create user outlets
    await prisma.userOutlet.createMany({
      data: [
        { userId: owner.id, outletId: mainOutlet.id, role: 'OWNER' },
        { userId: owner.id, outletId: bsdOutlet.id, role: 'OWNER' },
        { userId: admin.id, outletId: mainOutlet.id, role: 'MANAGER' },
        { userId: admin.id, outletId: bsdOutlet.id, role: 'MANAGER' },
        { userId: cashier.id, outletId: mainOutlet.id, role: 'CASHIER' }
      ]
    });

    console.log('User outlets created successfully!');

  } catch (error) {
    console.error('Error:', error.message);
    if (error.code === 'P2002') {
      console.log('Data already exists, skipping...');
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();