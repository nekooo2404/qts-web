import 'dotenv/config';

import { Client } from 'pg';

const seedLockName = 'qts-public-api-seed';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({
    application_name: 'qts-public-api-seed',
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: true }
        : false,
  });

  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [seedLockName]);

    await client.query(
      `INSERT INTO public.projects
        (id, title, description, image_url, category, status, published_at)
       VALUES
        ($1, $2, $3, $4, $5, 'PUBLISHED', $6),
        ($7, $8, $9, $10, $11, 'PUBLISHED', $12),
        ($13, $14, $15, $16, $17, 'PUBLISHED', $18)
       ON CONFLICT (id) DO NOTHING`,
      [
        '11111111-1111-4111-8111-111111111111',
        'Trung tâm điều hành an ninh mạng',
        'Nền tảng giám sát, phát hiện và điều phối ứng cứu sự cố an ninh mạng tập trung.',
        'https://images.qts.vn/projects/security-operations-center.webp',
        'Cybersecurity',
        '2026-08-01T01:00:00.000Z',
        '22222222-2222-4222-8222-222222222222',
        'Hạ tầng trung tâm dữ liệu doanh nghiệp',
        'Kiến trúc hạ tầng sẵn sàng cao, có khả năng mở rộng và vận hành liên tục.',
        'https://images.qts.vn/projects/enterprise-data-center.webp',
        'Infrastructure',
        '2026-08-02T01:00:00.000Z',
        '33333333-3333-4333-8333-333333333333',
        'Nền tảng quản trị đô thị thông minh',
        'Hợp nhất dữ liệu vận hành để hỗ trợ giám sát và ra quyết định theo thời gian thực.',
        'https://images.qts.vn/projects/smart-city-platform.webp',
        'Digital Transformation',
        '2026-08-03T01:00:00.000Z',
      ],
    );

    await client.query(
      `INSERT INTO public.solutions
        (id, problem, solution, description, status, sort_order, published_at)
       VALUES
        ($1, $2, $3, $4, 'PUBLISHED', 10, $5),
        ($6, $7, $8, $9, 'PUBLISHED', 20, $10),
        ($11, $12, $13, $14, 'PUBLISHED', 30, $15)
       ON CONFLICT (id) DO NOTHING`,
      [
        '44444444-4444-4444-8444-444444444444',
        'Rủi ro an ninh mạng ngày càng phức tạp',
        'Giám sát và ứng cứu an ninh mạng toàn diện',
        'Kết hợp công nghệ, quy trình và chuyên gia để bảo vệ hệ thống liên tục.',
        '2026-08-01T02:00:00.000Z',
        '55555555-5555-4555-8555-555555555555',
        'Hạ tầng phân mảnh và khó mở rộng',
        'Hiện đại hóa hạ tầng số',
        'Chuẩn hóa kiến trúc, tối ưu tài nguyên và nâng cao độ sẵn sàng của dịch vụ.',
        '2026-08-02T02:00:00.000Z',
        '66666666-6666-4666-8666-666666666666',
        'Dữ liệu chưa được khai thác hiệu quả',
        'Nền tảng dữ liệu và phân tích thông minh',
        'Kết nối các nguồn dữ liệu để tạo thông tin quản trị nhất quán và kịp thời.',
        '2026-08-03T02:00:00.000Z',
      ],
    );

    await client.query(
      `INSERT INTO public.capabilities
        (id, title, description, status, sort_order, published_at)
       VALUES
        ($1, $2, $3, 'PUBLISHED', 10, $4),
        ($5, $6, $7, 'PUBLISHED', 20, $8),
        ($9, $10, $11, 'PUBLISHED', 30, $12),
        ($13, $14, $15, 'PUBLISHED', 40, $16)
       ON CONFLICT (id) DO NOTHING`,
      [
        '77777777-7777-4777-8777-777777777777',
        'Tư vấn và thiết kế kiến trúc',
        'Đánh giá hiện trạng và thiết kế lộ trình công nghệ phù hợp với mục tiêu kinh doanh.',
        '2026-08-01T03:00:00.000Z',
        '88888888-8888-4888-8888-888888888888',
        'Tích hợp hệ thống',
        'Kết nối nền tảng, dữ liệu và quy trình thành một hệ thống vận hành thống nhất.',
        '2026-08-02T03:00:00.000Z',
        '99999999-9999-4999-8999-999999999999',
        'An toàn thông tin',
        'Bảo vệ hạ tầng và dữ liệu theo mô hình phòng thủ nhiều lớp.',
        '2026-08-03T03:00:00.000Z',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'Vận hành và hỗ trợ',
        'Giám sát chủ động, xử lý sự cố và tối ưu hệ thống trong suốt vòng đời.',
        '2026-08-04T03:00:00.000Z',
      ],
    );

    await client.query(
      `INSERT INTO public.company_info
        (id, singleton_key, about, vision, mission, address, hotline)
       VALUES ($1, TRUE, $2, $3, $4, $5, $6)
       ON CONFLICT (singleton_key) DO NOTHING`,
      [
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        'QTS đồng hành cùng cơ quan, tổ chức và doanh nghiệp trong việc xây dựng hạ tầng số an toàn, ổn định và có khả năng mở rộng.',
        'Trở thành đối tác công nghệ tin cậy, đồng hành cùng tổ chức Việt Nam trong hành trình phát triển bền vững.',
        'Kiến tạo các giải pháp công nghệ an toàn, thực tiễn và tạo ra giá trị đo lường được cho khách hàng.',
        'Hà Nội, Việt Nam',
        '+842473000888',
      ],
    );

    await client.query('COMMIT');
    console.info('Seed data is ready');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed error';
  console.error(`Seed failed: ${message}`);
  process.exitCode = 1;
});
