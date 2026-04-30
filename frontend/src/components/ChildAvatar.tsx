interface Props { name: string; size?: 'sm' | 'md' | 'lg' }

const sizes = { sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-14 h-14 text-xl' };

export default function ChildAvatar({ name, size = 'md' }: Props) {
  return (
    <div className={`${sizes[size]} bg-primary-100 rounded-full flex items-center justify-center font-bold text-primary-700 flex-shrink-0`}>
      {name[0]?.toUpperCase()}
    </div>
  );
}
