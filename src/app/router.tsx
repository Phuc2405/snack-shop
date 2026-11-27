import { createBrowserRouter } from 'react-router-dom';
import { RootLayout, ShopLayout } from './layouts';
import { lazyPage } from './lazyPage';
import HomePage from '@/pages/HomePage';
import { NotFoundPage, RouteError } from '@/pages/NotFoundPage';
import { DEMO } from '@/lib/demo';
import { DemoAdminNotice } from '@/pages/admin/DemoAdminNotice';

// Trang chủ (menu) nằm trong bundle đầu để hiện nhanh nhất; các trang khác tách chunk theo route.
// Khách không bao giờ tải code trang quản lý.
const CheckoutPage = lazyPage(() => import('@/pages/CheckoutPage'));
const OrdersPage = lazyPage(() => import('@/pages/OrdersPage'));
const OrderPage = lazyPage(() => import('@/pages/OrderPage'));
const AuthActionPage = lazyPage(() => import('@/pages/AuthActionPage'));
const LoginPage = lazyPage(() => import('@/pages/admin/LoginPage'));
const DashboardPage = lazyPage(() => import('@/pages/admin/DashboardPage'));
const ProductsPage = lazyPage(() => import('@/pages/admin/ProductsPage'));
const SettingsPage = lazyPage(() => import('@/pages/admin/SettingsPage'));
const ReportPage = lazyPage(() => import('@/pages/admin/ReportPage'));
// Khung quản lý cũng tách chunk: khách không bao giờ tải code đăng nhập / dashboard nhân viên
const AdminLayout = lazyPage(() => import('@/pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      {
        element: <ShopLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'checkout', element: <CheckoutPage /> },
          { path: 'orders', element: <OrdersPage /> },
          { path: 'orders/:id', element: <OrderPage /> },
          // Link trong email của Firebase Auth (đặt lại mật khẩu) — xem AuthActionPage
          { path: 'auth/action', element: <AuthActionPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      { path: 'admin/login', element: DEMO ? <DemoAdminNotice /> : <LoginPage /> },
      {
        path: 'admin',
        element: DEMO ? <DemoAdminNotice /> : <AdminLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'products', element: <ProductsPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'report', element: <ReportPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
