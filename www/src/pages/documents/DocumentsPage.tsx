import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Download, Eye, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { formatDate } from '@/lib/utils'

type DocumentType = 'INVOICE' | 'RECEIPT' | 'PO' | 'DELIVERY_NOTE' | 'RETURN'

interface Document {
  id: string
  type: DocumentType
  number: string
  relatedTo: string
  createdAt: string
  total?: number
}

export function DocumentsPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all')

  const documentTypes: Record<DocumentType, { labelKey: string; color: string }> = {
    INVOICE: { labelKey: 'invoice', color: 'default' },
    RECEIPT: { labelKey: 'receipt', color: 'success' },
    PO: { labelKey: 'purchaseOrder', color: 'secondary' },
    DELIVERY_NOTE: { labelKey: 'deliveryNote', color: 'warning' },
    RETURN: { labelKey: 'return', color: 'destructive' },
  }

  const typeOptions = [
    { value: 'all', label: t('status.allTypes') },
    { value: 'INVOICE', label: t('pages.documents.invoice') },
    { value: 'RECEIPT', label: t('pages.documents.receipt') },
    { value: 'PO', label: t('pages.documents.purchaseOrder') },
    { value: 'DELIVERY_NOTE', label: t('pages.documents.deliveryNote') },
    { value: 'RETURN', label: t('pages.documents.return') },
  ]

  // Mock data
  const documents: Document[] = [
    { id: '1', type: 'INVOICE', number: 'INV-2024-001', relatedTo: 'ORD-001', createdAt: '2024-01-15', total: 25000 },
    { id: '2', type: 'RECEIPT', number: 'RCP-2024-001', relatedTo: 'ORD-001', createdAt: '2024-01-15', total: 25000 },
    { id: '3', type: 'PO', number: 'PO-2024-001', relatedTo: 'Supplier A', createdAt: '2024-01-14', total: 150000 },
    { id: '4', type: 'DELIVERY_NOTE', number: 'DN-2024-001', relatedTo: 'ORD-002', createdAt: '2024-01-13' },
    { id: '5', type: 'RETURN', number: 'RMA-2024-001', relatedTo: 'Customer B', createdAt: '2024-01-12' },
  ]

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.number.toLowerCase().includes(search.toLowerCase()) ||
      doc.relatedTo.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || doc.type === typeFilter
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('pages.documents.title')}</h1>
        <p className="text-muted-foreground">{t('pages.documents.description')}</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('pages.documents.searchDocuments')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Combobox
          options={typeOptions}
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as DocumentType | 'all')}
          placeholder={t('status.allTypes')}
          searchPlaceholder={t('pages.documents.searchType')}
          className="w-44"
        />
      </div>

      {/* Documents Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredDocuments.map((doc) => (
          <Card key={doc.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{doc.number}</CardTitle>
                    <p className="text-sm text-muted-foreground">{doc.relatedTo}</p>
                  </div>
                </div>
                <Badge variant={documentTypes[doc.type].color as 'default'}>
                  {t(`pages.documents.${documentTypes[doc.type].labelKey}`)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {formatDate(doc.createdAt)}
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" title={t('common.viewDetails')}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title={t('common.download')}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('pages.documents.noDocuments')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
