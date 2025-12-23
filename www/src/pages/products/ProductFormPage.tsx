import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus, X, Trash2, Save, Upload, Package, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
  useProduct,
  useCreateProduct,
  useUpdateProduct,
  useUploadProductImage,
  UNIT_OPTIONS,
  type ProductFormValues,
} from '@/features/products';
import { useCategoryTree, flattenCategoryTree } from '@/features/categories';

const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  brand: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  price: z.number().min(0, 'Price must be positive'),
  cost: z.number().min(0, 'Cost must be positive'),
  compareAtPrice: z.number().min(0).optional(),
  weight: z.number().min(0).optional(),
  trackInventory: z.boolean().optional(),
  lotTracking: z.boolean().optional(),
  expiryTracking: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).optional(),
  hasVariants: z.boolean().optional(),
  attributeDefinitions: z
    .array(
      z.object({
        name: z.string().min(1, 'Attribute name is required'),
        values: z.array(z.string().min(1)).min(1, 'At least one value is required'),
      })
    )
    .optional(),
});

type FormValues = z.infer<typeof productSchema>;

export function ProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { data: product, isLoading: productLoading } = useProduct(id || '');
  const { data: categories } = useCategoryTree();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const uploadImage = useUploadProductImage();

  const [tagInput, setTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && id) {
      uploadImage.mutate({ productId: id, file });
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: '',
      name: '',
      unit: 'piece',
      price: 0,
      cost: 0,
      trackInventory: true,
      status: 'DRAFT',
      hasVariants: false,
      attributeDefinitions: [],
      tags: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'attributeDefinitions',
  });

  // Load product data when editing
  useEffect(() => {
    if (product && isEditing) {
      reset({
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        description: product.description,
        categoryId: product.categoryId,
        tags: product.tags,
        brand: product.brand,
        unit: product.unit,
        price: product.price / 100, // Convert from cents
        cost: product.cost / 100,
        compareAtPrice: product.compareAtPrice ? product.compareAtPrice / 100 : undefined,
        weight: product.weight,
        trackInventory: product.trackInventory,
        lotTracking: product.lotTracking,
        expiryTracking: product.expiryTracking,
        status: product.status,
        hasVariants: product.hasVariants,
        attributeDefinitions: product.attributeDefinitions,
      });
    }
  }, [product, isEditing, reset]);

  const hasVariants = watch('hasVariants');
  const tags = watch('tags') || [];
  const flatCategories = categories ? flattenCategoryTree(categories) : [];

  const onSubmit = (data: FormValues) => {
    // Convert prices to cents
    const formattedData: ProductFormValues = {
      ...data,
      price: Math.round(data.price * 100),
      cost: Math.round(data.cost * 100),
      compareAtPrice: data.compareAtPrice ? Math.round(data.compareAtPrice * 100) : undefined,
    };

    if (isEditing) {
      updateProduct.mutate(
        { id, data: formattedData },
        { onSuccess: () => navigate(`/products/${id}`) }
      );
    } else {
      createProduct.mutate(formattedData, {
        onSuccess: (result) => navigate(`/products/${result.data.id}`),
      });
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setValue('tags', [...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setValue(
      'tags',
      tags.filter((t) => t !== tag)
    );
  };

  const handleAddAttributeValue = (attrIndex: number, value: string) => {
    const currentValues = watch(`attributeDefinitions.${attrIndex}.values`) || [];
    if (value.trim() && !currentValues.includes(value.trim())) {
      setValue(`attributeDefinitions.${attrIndex}.values`, [...currentValues, value.trim()]);
    }
  };

  const handleRemoveAttributeValue = (attrIndex: number, valueIndex: number) => {
    const currentValues = watch(`attributeDefinitions.${attrIndex}.values`) || [];
    setValue(
      `attributeDefinitions.${attrIndex}.values`,
      currentValues.filter((_, i) => i !== valueIndex)
    );
  };

  const isLoading = createProduct.isPending || updateProduct.isPending;

  if (productLoading && isEditing) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {isEditing ? 'Edit Product' : 'New Product'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isEditing
                  ? 'Update product information'
                  : 'Add a new product to your catalog'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Product name, description, and identifiers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sku" required>
                      SKU
                    </Label>
                    <Input
                      id="sku"
                      placeholder="e.g., PROD-001"
                      error={!!errors.sku}
                      {...register('sku')}
                    />
                    {errors.sku && (
                      <p className="text-sm text-destructive">{errors.sku.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Barcode</Label>
                    <Input
                      id="barcode"
                      placeholder="e.g., 8859012345678"
                      {...register('barcode')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" required>
                    Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Wireless Bluetooth Headphones"
                    error={!!errors.name}
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your product..."
                    rows={4}
                    {...register('description')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
                <CardDescription>Set the price and cost for this product</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="price" required>
                      Selling Price (THB)
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      error={!!errors.price}
                      {...register('price', { valueAsNumber: true })}
                    />
                    {errors.price && (
                      <p className="text-sm text-destructive">{errors.price.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost" required>
                      Cost (THB)
                    </Label>
                    <Input
                      id="cost"
                      type="number"
                      min="0"
                      step="0.01"
                      error={!!errors.cost}
                      {...register('cost', { valueAsNumber: true })}
                    />
                    {errors.cost && (
                      <p className="text-sm text-destructive">{errors.cost.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="compareAtPrice">Compare at Price</Label>
                    <Input
                      id="compareAtPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Original price"
                      {...register('compareAtPrice', { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Variants */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Variants</CardTitle>
                    <CardDescription>
                      Products with multiple options like size or color
                    </CardDescription>
                  </div>
                  <Switch
                    checked={hasVariants}
                    onCheckedChange={(checked) => setValue('hasVariants', checked)}
                  />
                </div>
              </CardHeader>
              {hasVariants && (
                <CardContent className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="rounded-lg border p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <Input
                          placeholder="Attribute name (e.g., Size)"
                          className="max-w-xs"
                          {...register(`attributeDefinitions.${index}.name`)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(watch(`attributeDefinitions.${index}.values`) || []).map(
                          (value, valueIndex) => (
                            <Badge key={valueIndex} variant="secondary">
                              {value}
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveAttributeValue(index, valueIndex)
                                }
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )
                        )}
                        <Input
                          placeholder="Add value..."
                          className="w-32"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddAttributeValue(
                                index,
                                (e.target as HTMLInputElement).value
                              );
                              (e.target as HTMLInputElement).value = '';
                            }
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ name: '', values: [] })}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Attribute
                  </Button>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Product Image - only show when editing */}
            {isEditing && (
              <Card>
                <CardHeader>
                  <CardTitle>Product Image</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative aspect-square rounded-lg border-2 border-dashed bg-muted flex items-center justify-center overflow-hidden">
                    {product?.imageKey ? (
                      <img
                        src={`/api/products/${id}/image`}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Package className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No image</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadImage.isPending}
                  >
                    {uploadImage.isPending ? (
                      <>
                        <Spinner className="mr-2 h-4 w-4" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        {product?.imageKey ? 'Change Image' : 'Upload Image'}
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    JPG, PNG or WebP. Max 5MB.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={watch('status')}
                  onValueChange={(value) =>
                    setValue('status', value as 'ACTIVE' | 'DRAFT' | 'ARCHIVED')
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Organization */}
            <Card>
              <CardHeader>
                <CardTitle>Organization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="categoryId">Category</Label>
                  <Select
                    value={watch('categoryId') || 'none'}
                    onValueChange={(value) =>
                      setValue('categoryId', value === 'none' ? undefined : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {flatCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {'—'.repeat(cat.depth)} {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit" required>
                    Unit
                  </Label>
                  <Select
                    value={watch('unit')}
                    onValueChange={(value) => setValue('unit', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    placeholder="e.g., Apple"
                    {...register('brand')}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={handleAddTag}>
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Inventory Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="trackInventory">Track Inventory</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable stock tracking for this product
                    </p>
                  </div>
                  <Switch
                    id="trackInventory"
                    checked={watch('trackInventory')}
                    onCheckedChange={(checked) => setValue('trackInventory', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="lotTracking">Lot Tracking</Label>
                    <p className="text-xs text-muted-foreground">
                      Track inventory by lot/batch numbers
                    </p>
                  </div>
                  <Switch
                    id="lotTracking"
                    checked={watch('lotTracking')}
                    onCheckedChange={(checked) => setValue('lotTracking', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="expiryTracking">Expiry Tracking</Label>
                    <p className="text-xs text-muted-foreground">
                      Track expiration dates for perishables
                    </p>
                  </div>
                  <Switch
                    id="expiryTracking"
                    checked={watch('expiryTracking')}
                    onCheckedChange={(checked) => setValue('expiryTracking', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
