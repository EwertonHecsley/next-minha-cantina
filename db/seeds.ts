import { db } from '../db';
import { users, students, products, orders, orderItems } from '../db/schema';
import bcrypt from 'bcryptjs';

const SECRET = process.env.SESSION_SECRET || 'dev-session-secret-change-in-production';

async function seed() {
  console.log('🌱 Seed starting...');

  // Clear existing data
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(products);
  await db.delete(students);
  await db.delete(users);
  console.log('  Cleared tables');

  // --- Users ---
  const managerPassword = await bcrypt.hash('manager123', 10);
  const operatorPassword = await bcrypt.hash('operator123', 10);

  const [manager] = await db.insert(users).values({
    name: 'Gestor Principal',
    email: 'gestor@cantina.com',
    passwordHash: managerPassword,
    role: 'MANAGER',
  }).returning();

  const [operator1] = await db.insert(users).values({
    name: 'Operador 1',
    email: 'operador1@cantina.com',
    passwordHash: operatorPassword,
    role: 'OPERATOR',
  }).returning();

  const [operator2] = await db.insert(users).values({
    name: 'Operador 2',
    email: 'operador2@cantina.com',
    passwordHash: operatorPassword,
    role: 'OPERATOR',
  }).returning();

  console.log(`  Created user: ${manager.email} (manager)`);
  console.log(`  Created user: ${operator1.email} (operator)`);
  console.log(`  Created user: ${operator2.email} (operator)`);

  // --- Students ---
  const studentNames = [
    { name: 'Ana Paula Silva', grade: '1º Ano A', parentName: 'Maria Silva', parentPhone: '11998765432' },
    { name: 'Bruno Costa Lima', grade: '2º Ano B', parentName: 'Carlos Lima', parentPhone: '11987654321' },
    { name: 'Camila Ferreira', grade: '1º Ano C', parentName: 'Ana Ferreira', parentPhone: '11976543210' },
    { name: 'Diego Santos Oliveira', grade: '3º Ano A', parentName: 'Roberto Oliveira', parentPhone: '11965432109' },
    { name: 'Elena Rodrigues', grade: '2º Ano A', parentName: 'Patricia Rodrigues', parentPhone: '11954321098' },
    { name: 'Felipe Almeida', grade: '1º Ano B', parentName: 'José Almeida', parentPhone: '11943210987' },
    { name: 'Gabriela Souza', grade: '3º Ano B', parentName: 'Fernanda Souza', parentPhone: '11932109876' },
    { name: 'Hugo Martins', grade: '2º Ano C', parentName: 'Sérgio Martins', parentPhone: '11921098765' },
    { name: 'Isabela Costa', grade: '1º Ano A', parentName: 'Claudia Costa', parentPhone: '11910987654' },
    { name: 'João Pedro Barbosa', grade: '3º Ano C', parentName: 'Marcos Barbosa', parentPhone: '11909876543' },
    { name: 'Kaity Fernandes', grade: '2º Ano B', parentName: 'Amanda Fernandes', parentPhone: '11898765432' },
    { name: 'Lucas Henrique Dias', grade: '1º Ano C', parentName: 'Roberto Dias', parentPhone: '11887654321' },
  ];

  const insertedStudents = await db.insert(students).values(studentNames).returning();
  console.log(`  Created ${insertedStudents.length} students`);

  // --- Products ---
  const productData = [
    { name: 'Coxinha de Frango', priceInCents: 500, stock: 50, isActive: 'true' },
    { name: 'Empada de Palmito', priceInCents: 450, stock: 40, isActive: 'true' },
    { name: 'Pão de Queijo', priceInCents: 350, stock: 60, isActive: 'true' },
    { name: 'Suco Natural 300ml', priceInCents: 600, stock: 30, isActive: 'true' },
    { name: 'Refrigerante Lata', priceInCents: 400, stock: 48, isActive: 'true' },
    { name: 'Bolo de Chocolate', priceInCents: 700, stock: 25, isActive: 'true' },
    { name: 'Sanduíche Natural', priceInCents: 800, stock: 20, isActive: 'true' },
    { name: 'Barra de Chocolate', priceInCents: 300, stock: 40, isActive: 'true' },
    { name: 'Batata Frita Pkg', priceInCents: 900, stock: 35, isActive: 'true' },
    { name: 'Água Mineral 500ml', priceInCents: 250, stock: 60, isActive: 'true' },
    { name: 'Mousse de Maracujá', priceInCents: 550, stock: 20, isActive: 'true' },
    { name: 'Cachorro-Quente', priceInCents: 650, stock: 30, isActive: 'true' },
  ];

  const insertedProducts = await db.insert(products).values(productData).returning();
  console.log(`  Created ${insertedProducts.length} products`);

  // --- Sample Orders ---
  const now = new Date();
  const sampleOrders = [
    { studentIdx: 0, operatorId: operator1.id, items: [{ productId: insertedProducts[0].id, productName: 'Coxinha de Frango', quantity: 2, unitPriceInCents: 500, subtotalInCents: 1000 }] },
    { studentIdx: 1, operatorId: operator1.id, items: [{ productId: insertedProducts[2].id, productName: 'Pão de Queijo', quantity: 3, unitPriceInCents: 350, subtotalInCents: 1050 }] },
    { studentIdx: 2, operatorId: operator2.id, items: [{ productId: insertedProducts[3].id, productName: 'Suco Natural 300ml', quantity: 1, unitPriceInCents: 600, subtotalInCents: 600 }, { productId: insertedProducts[5].id, productName: 'Bolo de Chocolate', quantity: 1, unitPriceInCents: 700, subtotalInCents: 700 }] },
    { studentIdx: 3, operatorId: operator1.id, items: [{ productId: insertedProducts[6].id, productName: 'Sanduíche Natural', quantity: 1, unitPriceInCents: 800, subtotalInCents: 800 }] },
    { studentIdx: 4, operatorId: operator2.id, items: [{ productId: insertedProducts[1].id, productName: 'Empada de Palmito', quantity: 2, unitPriceInCents: 450, subtotalInCents: 900 }, { productId: insertedProducts[4].id, productName: 'Refrigerante Lata', quantity: 1, unitPriceInCents: 400, subtotalInCents: 400 }] },
    { studentIdx: 0, operatorId: operator2.id, items: [{ productId: insertedProducts[7].id, productName: 'Barra de Chocolate', quantity: 2, unitPriceInCents: 300, subtotalInCents: 600 }] },
    { studentIdx: 5, operatorId: operator1.id, items: [{ productId: insertedProducts[8].id, productName: 'Batata Frita Pkg', quantity: 1, unitPriceInCents: 900, subtotalInCents: 900 }, { productId: insertedProducts[9].id, productName: 'Água Mineral 500ml', quantity: 1, unitPriceInCents: 250, subtotalInCents: 250 }] },
    { studentIdx: 7, operatorId: operator2.id, items: [{ productId: insertedProducts[11].id, productName: 'Cachorro-Quente', quantity: 1, unitPriceInCents: 650, subtotalInCents: 650 }] },
    { studentIdx: 9, operatorId: operator1.id, items: [{ productId: insertedProducts[10].id, productName: 'Mousse de Maracujá', quantity: 1, unitPriceInCents: 550, subtotalInCents: 550 }] },
    { studentIdx: 2, operatorId: operator2.id, items: [{ productId: insertedProducts[0].id, productName: 'Coxinha de Frango', quantity: 1, unitPriceInCents: 500, subtotalInCents: 500 }, { productId: insertedProducts[4].id, productName: 'Refrigerante Lata', quantity: 1, unitPriceInCents: 400, subtotalInCents: 400 }] },
  ];

  for (const ord of sampleOrders) {
    const student = insertedStudents[ord.studentIdx];
    const totalCents = ord.items.reduce((acc, i) => acc + i.subtotalInCents, 0);
    const itemsDesc = ord.items.map(i => `${i.quantity}x ${i.productName}`).join(', ');
    const whatsappMessage = `Olá! Seu pedido foi registrado na cantina:\n${itemsDesc}\nTotal: R$ ${(totalCents / 100).toFixed(2)}\nObrigado pela preferência!`;

    const [order] = await db.insert(orders).values({
      studentId: student.id,
      studentName: student.name,
      operatorId: ord.operatorId,
      totalInCents: totalCents,
      whatsappMessage,
      createdAt: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    }).returning();

    for (const item of ord.items) {
      await db.insert(orderItems).values({
        orderId: order.id,
        ...item,
      });
    }
  }
  console.log(`  Created ${sampleOrders.length} orders with items`);

  console.log('\n✅ Seed completed!');
  console.log('\n📋 Login credentials:');
  console.log('  Gestor:  gestor@cantina.com / manager123');
  console.log('  Operador: operador1@cantina.com / operator123');
  console.log('  Operador: operador2@cantina.com / operator123');
}

seed().catch(console.error);
