import { NextResponse } from 'next/server';
import { db } from '@/db';
import { students, products, users, orders, orderItems } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

interface SaleItemInput {
  productId: string;
  name?: string;
  unitPrice: string | number;
  quantity: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSaleItem(value: unknown): value is SaleItemInput {
  return isRecord(value)
    && typeof value.productId === 'string'
    && (typeof value.unitPrice === 'string' || typeof value.unitPrice === 'number')
    && Number.isFinite(Number(value.unitPrice))
    && typeof value.quantity === 'number'
    && Number.isInteger(value.quantity)
    && value.quantity > 0
    && (value.name === undefined || typeof value.name === 'string');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  try {
    if (type === 'students') {
      const allStudents = await db.select().from(students);
      return NextResponse.json(allStudents);
    }
    if (type === 'products') {
      const allProducts = await db.select().from(products);
      return NextResponse.json(allProducts);
    }
    if (type === 'operators') {
      const allOperators = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
      }).from(users).where(eq(users.role, 'OPERATOR'));
      return NextResponse.json(allOperators);
    }
    if (type === 'dashboard') {
      const totalOrdersResult = await db.select({ 
        count: sql<number>`count(*)`, 
        sum: sql<number>`sum(total_in_cents)` 
      }).from(orders);

      // Top products sold
      const topProducts = await db.select({
        name: orderItems.productName,
        totalQty: sql<number>`sum(${orderItems.quantity})`,
      })
        .from(orderItems)
        .groupBy(orderItems.productName)
        .limit(5);

      // Student revenue summary
      const studentRevenue = await db.select({
        studentId: orders.studentId,
        studentName: orders.studentName,
        totalSpent: sql<number>`sum(${orders.totalInCents})`,
        purchaseCount: sql<number>`count(*)`,
      })
        .from(orders)
        .groupBy(orders.studentId, orders.studentName)
        .limit(10);

      // Operator stats
      const operatorStats = await db.select({
        operatorId: orders.operatorId,
        totalSales: sql<number>`count(*)`,
        totalRevenue: sql<number>`sum(${orders.totalInCents})`,
      })
        .from(orders)
        .groupBy(orders.operatorId)
        .limit(10);

      return NextResponse.json({
        summary: {
          count: Number(totalOrdersResult[0]?.count || 0),
          sum: ((totalOrdersResult[0]?.sum as number | null) || 0) / 100,
        },
        topProducts,
        studentRevenue,
        operatorStats,
      });
    }
    if (type === 'student-sales' && searchParams.has('id')) {
      const studentId = searchParams.get('id');
      const saleHistory = await db
        .select()
        .from(orders)
        .where(eq(orders.studentId, studentId!))
        .orderBy((t) => t.createdAt);

      return NextResponse.json(saleHistory);
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error: unknown) {
    console.error('API Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erro interno do servidor.',
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!isRecord(body) || typeof body.action !== 'string') {
      return NextResponse.json({ error: 'Dados da solicitação inválidos.' }, { status: 400 });
    }

    const { action } = body;

    if (action === 'create_student') {
      if (
        typeof body.name !== 'string'
        || typeof body.parentName !== 'string'
        || typeof body.parentPhone !== 'string'
        || (body.grade !== undefined && typeof body.grade !== 'string')
      ) {
        return NextResponse.json({ error: 'Informe os dados válidos do aluno e responsável.' }, { status: 400 });
      }

      const [newStudent] = await db.insert(students).values({
        name: body.name,
        grade: body.grade || '1',
        parentName: body.parentName,
        parentPhone: body.parentPhone,
      }).returning();
      return NextResponse.json(newStudent);
    }

    if (action === 'create_product') {
      const price = Number(body.price);
      const stock = Number(body.stock);
      if (
        typeof body.name !== 'string'
        || !Number.isFinite(price)
        || price < 0
        || !Number.isInteger(stock)
        || stock < 0
        || (body.imageUrl !== undefined && body.imageUrl !== null && typeof body.imageUrl !== 'string')
      ) {
        return NextResponse.json({ error: 'Informe dados válidos para o produto.' }, { status: 400 });
      }

      const [newProduct] = await db.insert(products).values({
        name: body.name,
        priceInCents: Math.round(price * 100),
        stock,
        imageUrl: typeof body.imageUrl === 'string' && body.imageUrl ? body.imageUrl : null,
      }).returning();
      return NextResponse.json(newProduct);
    }

    if (action === 'create_operator') {
      if (typeof body.name !== 'string' || typeof body.email !== 'string' || !body.email.includes('@')) {
        return NextResponse.json({ error: 'Informe um nome e um e-mail válido para o operador.' }, { status: 400 });
      }

      const [newOp] = await db.insert(users).values({
        name: body.name,
        email: body.email,
        role: 'OPERATOR',
        passwordHash: '', // placeholder
      }).returning();
      return NextResponse.json(newOp);
    }

    if (action === 'create_sale') {
      const { studentId, operatorId, items } = body;
      if (
        typeof studentId !== 'string'
        || typeof operatorId !== 'string'
        || !Array.isArray(items)
        || items.length === 0
        || !items.every(isSaleItem)
      ) {
        return NextResponse.json({ error: 'Informe um aluno, operador e itens válidos para a venda.' }, { status: 400 });
      }

      let totalAmount = 0;
      const formattedItems = items.map((item) => {
        const unitPrice = Math.round(Number(item.unitPrice) * 100);
        const qty = item.quantity;
        totalAmount += unitPrice * qty;
        return {
          productId: item.productId,
          productName: item.name || 'Produto',
          quantity: qty,
          unitPriceInCents: unitPrice,
          subtotalInCents: unitPrice * qty,
        };
      });

      // Get student info
      const student = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
      const studentName = student[0]?.name || 'Desconhecido';

      // Build WhatsApp message for the order
      const itemsDesc = formattedItems.map(i => `${i.quantity}x ${i.productName}`).join(', ');
      const whatsappMessage = `Olá! Seu pedido foi registrado na cantina:\n${itemsDesc}\nTotal: R$ ${(totalAmount / 100).toFixed(2)}\nObrigado pela preferência!`;

      const [sale] = await db.insert(orders).values({
        studentId,
        studentName,
        operatorId,
        totalInCents: totalAmount,
        whatsappMessage,
      }).returning();

      for (const item of formattedItems) {
        await db.insert(orderItems).values({ ...item, orderId: sale.id });
        
        // Decrease stock
        await db.update(products)
          .set({ stock: sql`${products.stock} - ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }

      return NextResponse.json({ success: true, saleId: sale.id });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('API Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erro interno do servidor.',
    }, { status: 500 });
  }
}
