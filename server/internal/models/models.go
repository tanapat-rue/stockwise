package models

import "time"

type Role string

const (
	RolePlatformAdmin Role = "PLATFORM_ADMIN"
	RoleOrgAdmin      Role = "ORG_ADMIN"
	RoleBranchManager Role = "BRANCH_MANAGER"
	RoleStaff         Role = "STAFF"
)

type Organization struct {
	ID      string `bson:"_id" json:"id"`
	Name    string `bson:"name" json:"name"`
	TaxID   string `bson:"taxId,omitempty" json:"taxId,omitempty"`
	Address string `bson:"address,omitempty" json:"address,omitempty"`

	Subscription Subscription `bson:"subscription,omitempty" json:"subscription,omitempty"`

	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}

type Subscription struct {
	Status string `bson:"status,omitempty" json:"status,omitempty"` // e.g. "trialing", "active", "past_due", "canceled"
	Plan   string `bson:"plan,omitempty" json:"plan,omitempty"`

	CurrentPeriodEnd time.Time `bson:"currentPeriodEnd,omitempty" json:"currentPeriodEnd,omitempty"`

	OmiseCustomerID string `bson:"omiseCustomerId,omitempty" json:"omiseCustomerId,omitempty"`
	OmiseScheduleID string `bson:"omiseScheduleId,omitempty" json:"omiseScheduleId,omitempty"`
}

type Branch struct {
	ID      string `bson:"_id" json:"id"`
	OrgID   string `bson:"orgId" json:"orgId"`
	Name    string `bson:"name" json:"name"`
	Address string `bson:"address,omitempty" json:"address,omitempty"`
	IsMain  bool   `bson:"isMain" json:"isMain"`

	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}

type User struct {
	ID       string `bson:"_id" json:"id"`
	OrgID    string `bson:"orgId" json:"orgId"`
	BranchID string `bson:"branchId,omitempty" json:"branchId,omitempty"`

	Name         string `bson:"name" json:"name"`
	Email        string `bson:"email" json:"email"`
	PasswordHash string `bson:"passwordHash" json:"-"`
	Role         Role   `bson:"role" json:"role"`

	IsActive bool `bson:"isActive" json:"isActive"`

	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}

type AppSettings struct {
	UserID string `bson:"_id" json:"userId"`

	Language   string `bson:"language" json:"language"`
	Currency   string `bson:"currency" json:"currency"`
	ThemeColor string `bson:"themeColor" json:"themeColor"`
	IsDark     bool   `bson:"isDark" json:"isDark"`

	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}

type Category struct {
	ID          string `bson:"_id" json:"id"`
	OrgID       string `bson:"orgId" json:"orgId"`
	Name        string `bson:"name" json:"name"`
	Slug        string `bson:"slug" json:"slug"`
	ParentID    string `bson:"parentId,omitempty" json:"parentId,omitempty"`
	Path        string `bson:"path" json:"path"` // Materialized path for hierarchical queries
	Description string `bson:"description,omitempty" json:"description,omitempty"`
	Image       string `bson:"image,omitempty" json:"image,omitempty"`
	SortOrder   int    `bson:"sortOrder" json:"sortOrder"`
	IsActive    bool   `bson:"isActive" json:"isActive"`

	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}

type Product struct {
	ID         string `bson:"_id" json:"id"`
	OrgID      string `bson:"orgId" json:"orgId"`
	SKU        string `bson:"sku" json:"sku"`
	Name       string `bson:"name" json:"name"`
	Desc       string `bson:"description" json:"description"`
	Price      int64  `bson:"price" json:"price"`
	Cost       int64  `bson:"cost" json:"cost"`
	Category   string `bson:"category" json:"category"`
	CategoryID string `bson:"categoryId,omitempty" json:"categoryId,omitempty"`

	Image      string `bson:"image,omitempty" json:"image,omitempty"`
	ImageKey   string `bson:"imageKey,omitempty" json:"imageKey,omitempty"`
	WeightGram int    `bson:"weightGram,omitempty" json:"weight,omitempty"`
	Dimensions string `bson:"dimensions,omitempty" json:"dimensions,omitempty"`

	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}

type StockLevel struct {
	ID        string `bson:"_id" json:"id"`
	OrgID     string `bson:"orgId" json:"orgId"`
	ProductID string `bson:"productId" json:"productId"`
	BranchID  string `bson:"branchId" json:"branchId"`

	Quantity    int    `bson:"quantity" json:"quantity"`
	Reserved    int    `bson:"reserved" json:"reserved"`
	MinStock    int    `bson:"minStock" json:"minStock"`
	BinLocation string `bson:"binLocation,omitempty" json:"binLocation,omitempty"`

	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}

type Customer struct {
	ID      string `bson:"_id" json:"id"`
	OrgID   string `bson:"orgId" json:"orgId"`
	Name    string `bson:"name" json:"name"`
	Phone   string `bson:"phone" json:"phone"`
	Email   string `bson:"email,omitempty" json:"email,omitempty"`
	Address string `bson:"address,omitempty" json:"address,omitempty"`

	Points     int   `bson:"points" json:"points"`
	TotalSpent int64 `bson:"totalSpent" json:"totalSpent"`

	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}

type Supplier struct {
	ID          string `bson:"_id" json:"id"`
	OrgID       string `bson:"orgId" json:"orgId"`
	Name        string `bson:"name" json:"name"`
	ContactName string `bson:"contactName" json:"contactName"`
	Phone       string `bson:"phone" json:"phone"`
	Email       string `bson:"email,omitempty" json:"email,omitempty"`
	Address     string `bson:"address,omitempty" json:"address,omitempty"`
	TaxID       string `bson:"taxId,omitempty" json:"taxId,omitempty"`

	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}

type PurchaseOrderItem struct {
	ProductID   string `bson:"productId" json:"productId"`
	ProductName string `bson:"productName" json:"productName"`
	ProductSKU  string `bson:"productSku,omitempty" json:"productSku,omitempty"`
	Unit        string `bson:"unit,omitempty" json:"unit,omitempty"`
	Quantity    int    `bson:"quantity" json:"quantity"`
	UnitCost    int64  `bson:"unitCost" json:"unitCost"`
	Discount    int64  `bson:"discount,omitempty" json:"discount,omitempty"`
}

type PurchaseOrder struct {
	ID          string `bson:"_id" json:"id"`
	OrgID       string `bson:"orgId" json:"orgId"`
	BranchID    string `bson:"branchId" json:"branchId"`
	ReferenceNo string `bson:"referenceNo" json:"referenceNo"`
	Date        string `bson:"date" json:"date"` // RFC3339

	SupplierID string `bson:"supplierId" json:"supplierId"`
	Status     string `bson:"status" json:"status"` // OPEN|RECEIVED|CANCELLED

	Items     []PurchaseOrderItem `bson:"items" json:"items"`
	TotalCost int64               `bson:"totalCost" json:"totalCost"`

	// Additional financial fields
	DiscountAmount int64   `bson:"discountAmount,omitempty" json:"discountAmount,omitempty"`
	TaxRate        float64 `bson:"taxRate,omitempty" json:"taxRate,omitempty"`
	ShippingCost   int64   `bson:"shippingCost,omitempty" json:"shippingCost,omitempty"`

	// Notes and shipping
	Note            string `bson:"note,omitempty" json:"note,omitempty"`
	InternalNotes   string `bson:"internalNotes,omitempty" json:"internalNotes,omitempty"`
	ShippingChannel string `bson:"shippingChannel,omitempty" json:"shippingChannel,omitempty"`

	// Dates
	ExpectedDeliveryDate string `bson:"expectedDeliveryDate,omitempty" json:"expectedDeliveryDate,omitempty"`
	ReceivedDate         string `bson:"receivedDate,omitempty" json:"receivedDate,omitempty"`

	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}

type InventoryLot struct {
	ID       string `bson:"_id" json:"id"`
	OrgID    string `bson:"orgId" json:"orgId"`
	BranchID string `bson:"branchId" json:"branchId"`
	ProductID string `bson:"productId" json:"productId"`

	// Source describes where this lot came from (e.g. "PO", "ADJUSTMENT", "RETURN").
	Source string `bson:"source" json:"source"`

	PurchaseOrderID string `bson:"purchaseOrderId,omitempty" json:"purchaseOrderId,omitempty"`
	ReferenceNo     string `bson:"referenceNo,omitempty" json:"referenceNo,omitempty"`

	UnitCost     int64 `bson:"unitCost" json:"unitCost"`
	QtyReceived  int   `bson:"qtyReceived" json:"qtyReceived"`
	QtyRemaining int   `bson:"qtyRemaining" json:"qtyRemaining"`

	ReceivedAt time.Time `bson:"receivedAt" json:"receivedAt"`

	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}

type ShippingInfo struct {
	Carrier        string `bson:"carrier" json:"carrier"`
	TrackingNumber string `bson:"trackingNumber" json:"trackingNumber"`
	LabelURL       string `bson:"labelUrl,omitempty" json:"labelUrl,omitempty"`
	ShippedDate    string `bson:"shippedDate,omitempty" json:"shippedDate,omitempty"`
	DeliveredDate  string `bson:"deliveredDate,omitempty" json:"deliveredDate,omitempty"`
}

type TransactionItem struct {
	ID       string `bson:"id" json:"id"`
	SKU      string `bson:"sku" json:"sku"`
	Name     string `bson:"name" json:"name"`
	Category string `bson:"category,omitempty" json:"category,omitempty"`
	Image    string `bson:"image,omitempty" json:"image,omitempty"`

	Price int64 `bson:"price" json:"price"`
	Cost  int64 `bson:"cost" json:"cost"`
	LineCost int64 `bson:"lineCost,omitempty" json:"lineCost,omitempty"`

	Quantity int `bson:"quantity" json:"quantity"`
}

type CostLine struct {
	ProductID string `bson:"productId" json:"productId"`
	LotID     string `bson:"lotId" json:"lotId"`
	Quantity  int    `bson:"quantity" json:"quantity"`
	UnitCost  int64  `bson:"unitCost" json:"unitCost"`
	Amount    int64  `bson:"amount" json:"amount"`
}

type Transaction struct {
	ID      string `bson:"_id" json:"id"`
	OrgID   string `bson:"orgId" json:"orgId"`
	BranchID string `bson:"branchId" json:"branchId"`
	Date    string `bson:"date" json:"date"` // RFC3339

	Channel string `bson:"channel" json:"channel"`
	Type    string `bson:"type" json:"type"` // SALE|STOCK_IN|STOCK_OUT|ADJUSTMENT

	Status            string `bson:"status" json:"status"`             // COMPLETED|PENDING|CANCELLED|REFUNDED
	FulfillmentStatus string `bson:"fulfillmentStatus" json:"fulfillmentStatus"` // PENDING|...

	Items []TransactionItem `bson:"items" json:"items"`
	Total int64             `bson:"total" json:"total"`
	COGS  int64             `bson:"cogs,omitempty" json:"cogs,omitempty"`
	Profit int64            `bson:"profit,omitempty" json:"profit,omitempty"`
	UserID string           `bson:"userId" json:"userId"`

	CustomerID       string       `bson:"customerId,omitempty" json:"customerId,omitempty"`
	RecipientName    string       `bson:"recipientName" json:"recipientName"`
	RecipientPhone   string       `bson:"recipientPhone,omitempty" json:"recipientPhone,omitempty"`
	RecipientAddress string       `bson:"recipientAddress,omitempty" json:"recipientAddress,omitempty"`
	PaymentMethod    string       `bson:"paymentMethod,omitempty" json:"paymentMethod,omitempty"`
	Note             string       `bson:"note,omitempty" json:"note,omitempty"`
	CancellationReason string     `bson:"cancellationReason,omitempty" json:"cancellationReason,omitempty"`
	ReferenceID        string     `bson:"referenceId,omitempty" json:"referenceId,omitempty"`
	ShippingInfo       *ShippingInfo `bson:"shippingInfo,omitempty" json:"shippingInfo,omitempty"`
	CostLines          []CostLine `bson:"costLines,omitempty" json:"costLines,omitempty"`

	StockCommitted        bool `bson:"stockCommitted,omitempty" json:"stockCommitted,omitempty"`
	StockCommitInProgress bool `bson:"stockCommitInProgress,omitempty" json:"stockCommitInProgress,omitempty"`

	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}

// StockMovement tracks stock changes with full history
type StockMovement struct {
	ID        string `bson:"_id" json:"id"`
	OrgID     string `bson:"orgId" json:"orgId"`
	BranchID  string `bson:"branchId" json:"branchId"`
	ProductID string `bson:"productId" json:"productId"`

	Type             string `bson:"type" json:"type"` // PURCHASE_IN, SALE_OUT, ADJUSTMENT_IN, etc.
	Quantity         int    `bson:"quantity" json:"quantity"`
	PreviousQuantity int    `bson:"previousQuantity" json:"previousQuantity"`
	NewQuantity      int    `bson:"newQuantity" json:"newQuantity"`

	UnitCost  int64 `bson:"unitCost,omitempty" json:"unitCost,omitempty"`
	TotalCost int64 `bson:"totalCost,omitempty" json:"totalCost,omitempty"`

	ReferenceType   string `bson:"referenceType,omitempty" json:"referenceType,omitempty"` // ORDER, PURCHASE_ORDER, TRANSFER, ADJUSTMENT
	ReferenceID     string `bson:"referenceId,omitempty" json:"referenceId,omitempty"`
	ReferenceNumber string `bson:"referenceNumber,omitempty" json:"referenceNumber,omitempty"`
	LotID           string `bson:"lotId,omitempty" json:"lotId,omitempty"`

	Reason string `bson:"reason,omitempty" json:"reason,omitempty"`
	Notes  string `bson:"notes,omitempty" json:"notes,omitempty"`

	CreatedBy string    `bson:"createdBy" json:"createdBy"`
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
}

// StockTransferItem is an item in a stock transfer
type StockTransferItem struct {
	ProductID        string `bson:"productId" json:"productId"`
	ProductName      string `bson:"productName,omitempty" json:"productName,omitempty"`
	ProductSKU       string `bson:"productSku,omitempty" json:"productSku,omitempty"`
	Quantity         int    `bson:"quantity" json:"quantity"`
	ReceivedQuantity int    `bson:"receivedQuantity,omitempty" json:"receivedQuantity,omitempty"`
	LotID            string `bson:"lotId,omitempty" json:"lotId,omitempty"`
}

// StockTransfer represents a transfer of stock between branches
type StockTransfer struct {
	ID             string `bson:"_id" json:"id"`
	OrgID          string `bson:"orgId" json:"orgId"`
	TransferNumber string `bson:"transferNumber" json:"transferNumber"`

	FromBranchID string `bson:"fromBranchId" json:"fromBranchId"`
	ToBranchID   string `bson:"toBranchId" json:"toBranchId"`

	Status string `bson:"status" json:"status"` // DRAFT, PENDING, IN_TRANSIT, RECEIVED, CANCELLED

	Items []StockTransferItem `bson:"items" json:"items"`
	Notes string              `bson:"notes,omitempty" json:"notes,omitempty"`

	CreatedBy    string    `bson:"createdBy" json:"createdBy"`
	SentAt       time.Time `bson:"sentAt,omitempty" json:"sentAt,omitempty"`
	ReceivedAt   time.Time `bson:"receivedAt,omitempty" json:"receivedAt,omitempty"`
	ReceivedBy   string    `bson:"receivedBy,omitempty" json:"receivedBy,omitempty"`
	CancelledAt  time.Time `bson:"cancelledAt,omitempty" json:"cancelledAt,omitempty"`
	CancelledBy  string    `bson:"cancelledBy,omitempty" json:"cancelledBy,omitempty"`
	CancelReason string    `bson:"cancelReason,omitempty" json:"cancelReason,omitempty"`

	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}
