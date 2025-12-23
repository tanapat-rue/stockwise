import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateCategory,
  useUpdateCategory,
  useCategoryTree,
  flattenCategoryTree,
  type CategoryTree,
} from '@/features/categories';
import { slugify } from '@/lib/utils';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  parentId: z.string().optional(),
  description: z.string().optional(),
  sortOrder: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryTree | null;
  parentId?: string;
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  parentId,
}: CategoryFormDialogProps) {
  const { data: categories } = useCategoryTree();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const isEditing = !!category;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      slug: '',
      parentId: parentId || undefined,
      description: '',
      sortOrder: 0,
      isActive: true,
    },
  });

  // Reset form when dialog opens/closes or category changes
  useEffect(() => {
    if (open) {
      if (category) {
        reset({
          name: category.name,
          slug: category.slug,
          parentId: category.parentId || undefined,
          description: category.description || '',
          sortOrder: category.sortOrder,
          isActive: category.isActive,
        });
      } else {
        reset({
          name: '',
          slug: '',
          parentId: parentId || undefined,
          description: '',
          sortOrder: 0,
          isActive: true,
        });
      }
    }
  }, [open, category, parentId, reset]);

  // Auto-generate slug from name
  const name = watch('name');
  useEffect(() => {
    if (!isEditing && name) {
      setValue('slug', slugify(name));
    }
  }, [name, isEditing, setValue]);

  const onSubmit = (data: CategoryFormValues) => {
    if (isEditing && category) {
      updateCategory.mutate(
        { id: category.id, data },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    } else {
      createCategory.mutate(data, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  // Flatten categories for parent selection, excluding current category and its descendants
  const flatCategories = categories ? flattenCategoryTree(categories) : [];
  const availableParents = category
    ? flatCategories.filter(
        (c) => c.id !== category.id && !c.path.includes(`/${category.id}`)
      )
    : flatCategories;

  const isLoading = createCategory.isPending || updateCategory.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Category' : 'Create Category'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update the category details below'
                : 'Add a new category to organize your products'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" required>
                Name
              </Label>
              <Input
                id="name"
                placeholder="e.g., Electronics"
                error={!!errors.name}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                placeholder="e.g., electronics"
                {...register('slug')}
              />
              <p className="text-xs text-muted-foreground">
                URL-friendly identifier. Auto-generated from name if left empty.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentId">Parent Category</Label>
              <Select
                value={watch('parentId') || 'none'}
                onValueChange={(value) =>
                  setValue('parentId', value === 'none' ? undefined : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top Level)</SelectItem>
                  {availableParents.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {'—'.repeat(cat.depth)} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe this category..."
                rows={3}
                {...register('description')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive categories won't be shown to customers
                </p>
              </div>
              <Switch
                id="isActive"
                checked={watch('isActive')}
                onCheckedChange={(checked) => setValue('isActive', checked)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
