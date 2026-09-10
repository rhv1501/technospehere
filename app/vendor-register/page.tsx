import { getCategories } from '@/actions/categories';
import { PublicVendorRegisterForm } from './PublicVendorRegisterForm';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export const revalidate = 0;

export default async function VendorRegisterPage() {
  const catRes = await getCategories();
  const categories = catRes.categories || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center p-4 md:p-8 relative transition-colors duration-200">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-2xl">
        <PublicVendorRegisterForm categories={categories} />
      </div>
    </div>
  );
}
