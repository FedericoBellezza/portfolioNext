import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-64 bg-[#E0D6CC]" />
        <Skeleton className="h-10 w-48 bg-[#E0D6CC]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 bg-[#E0D6CC] rounded-xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80 bg-[#E0D6CC] rounded-xl" />
        <Skeleton className="h-80 bg-[#E0D6CC] rounded-xl" />
      </div>

      <Skeleton className="h-96 bg-[#E0D6CC] rounded-xl" />
    </div>
  )
}
