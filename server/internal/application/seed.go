package application

import (
	"context"
	"fmt"
	"math/rand"
	"strings"
	"time"

	"stockflows/server/internal/appconfig"
	"stockflows/server/internal/auth"
	"stockflows/server/internal/models"
	"stockflows/server/internal/repo"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func ensureSeedAdmin(ctx context.Context, cfg appconfig.Config, r *repo.Repo) error {
	if !cfg.Seed.Enabled {
		return nil
	}

	anyUsers, err := r.HasAnyUsers(ctx)
	if err != nil {
		return fmt.Errorf("seed: check users: %w", err)
	}
	if anyUsers {
		return nil
	}

	email := strings.ToLower(strings.TrimSpace(cfg.Seed.AdminEmail))
	password := strings.TrimSpace(cfg.Seed.AdminPassword)
	if email == "" || password == "" {
		return fmt.Errorf("seed: adminEmail and adminPassword are required")
	}

	passwordHash, err := auth.HashPassword(password)
	if err != nil {
		return fmt.Errorf("seed: hash password: %w", err)
	}

	orgID := primitive.NewObjectID().Hex()
	org := models.Organization{
		ID:   orgID,
		Name: "StockWise Demo",
	}
	if _, err := r.CreateOrg(ctx, org); err != nil {
		return fmt.Errorf("seed: create org: %w", err)
	}

	branchID := primitive.NewObjectID().Hex()
	branch := models.Branch{
		ID:     branchID,
		OrgID:  orgID,
		Name:   "Main Branch",
		IsMain: true,
	}
	if _, err := r.CreateBranch(ctx, branch); err != nil {
		_ = r.DeleteOrg(ctx, orgID)
		return fmt.Errorf("seed: create branch: %w", err)
	}

	// Create second branch
	branch2ID := primitive.NewObjectID().Hex()
	branch2 := models.Branch{
		ID:      branch2ID,
		OrgID:   orgID,
		Name:    "Branch 2 - Mall",
		Address: "Central Mall, Floor 2",
		IsMain:  false,
	}
	r.CreateBranch(ctx, branch2)

	userID := primitive.NewObjectID().Hex()
	user := models.User{
		ID:           userID,
		OrgID:        orgID,
		Name:         "Admin",
		Email:        email,
		PasswordHash: passwordHash,
		Role:         models.RoleOrgAdmin,
		IsActive:     true,
	}
	if _, err := r.CreateUser(ctx, user); err != nil {
		_ = r.DeleteBranch(ctx, branchID)
		_ = r.DeleteOrg(ctx, orgID)
		return fmt.Errorf("seed: create user: %w", err)
	}

	// Seed demo data with dynamic IDs
	seedDemoData(ctx, r, orgID, branchID, branch2ID, userID)

	return nil
}

// seedDemoData generates and inserts realistic demo data with dynamically generated IDs
func seedDemoData(ctx context.Context, r *repo.Repo, orgID, branchID, branch2ID, userID string) {
	now := time.Now()
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))

	// Maps to store generated IDs for relationships
	categoryIDs := make(map[string]string) // name -> ID
	productIDs := make(map[string]string)  // SKU -> ID
	customerIDs := make([]string, 0)
	supplierIDs := make(map[string]string) // name -> ID
	poIDs := make(map[string]string)       // ref -> ID

	// ========== CATEGORIES ==========
	categoryData := []struct {
		name      string
		slug      string
		sortOrder int
	}{
		{"Clothing", "clothing", 1},
		{"Home & Living", "home-living", 2},
		{"Food & Beverage", "food-beverage", 3},
		{"Beauty", "beauty", 4},
		{"Electronics", "electronics", 5},
	}

	for _, c := range categoryData {
		id := primitive.NewObjectID().Hex()
		categoryIDs[c.name] = id
		cat := models.Category{
			ID:        id,
			OrgID:     orgID,
			Name:      c.name,
			Slug:      c.slug,
			Path:      "/" + c.slug,
			SortOrder: c.sortOrder,
			IsActive:  true,
		}
		r.CreateCategory(ctx, cat)
	}
	fmt.Printf("  Created %d categories\n", len(categoryData))

	// ========== PRODUCTS ==========
	productData := []struct {
		sku      string
		name     string
		price    int64
		cost     int64
		category string
	}{
		// Clothing
		{"CLO-TS-S", "Basic T-Shirt (S)", 39900, 15000, "Clothing"},
		{"CLO-TS-M", "Basic T-Shirt (M)", 39900, 15000, "Clothing"},
		{"CLO-TS-L", "Basic T-Shirt (L)", 39900, 15000, "Clothing"},
		{"CLO-JN-01", "Classic Denim Jeans", 129900, 55000, "Clothing"},
		{"CLO-SN-01", "Canvas Sneakers", 89900, 35000, "Clothing"},
		{"CLO-CP-01", "Baseball Cap", 29900, 10000, "Clothing"},
		// Home & Living
		{"HOM-PL-01", "Memory Foam Pillow", 59900, 25000, "Home & Living"},
		{"HOM-TW-01", "Cotton Towel Set (3pc)", 49900, 20000, "Home & Living"},
		{"HOM-CN-01", "Scented Candle - Lavender", 24900, 8000, "Home & Living"},
		{"HOM-FR-01", "Picture Frame 8x10", 19900, 7000, "Home & Living"},
		{"HOM-SB-01", "Storage Box Set (3pc)", 34900, 12000, "Home & Living"},
		// Food & Beverage
		{"FOD-CF-01", "Premium Coffee Beans 500g", 34900, 18000, "Food & Beverage"},
		{"FOD-HN-01", "Organic Honey 350g", 29900, 15000, "Food & Beverage"},
		{"FOD-SN-01", "Mixed Nuts Snack Box", 19900, 9000, "Food & Beverage"},
		{"FOD-TE-01", "Green Tea Gift Set", 44900, 22000, "Food & Beverage"},
		// Beauty
		{"BTY-SP-01", "Handmade Soap Set", 24900, 10000, "Beauty"},
		{"BTY-LT-01", "Body Lotion 250ml", 29900, 12000, "Beauty"},
		{"BTY-PF-01", "Eau de Parfum 50ml", 89900, 35000, "Beauty"},
		// Electronics
		{"ELC-SP-01", "Bluetooth Speaker Mini", 79900, 35000, "Electronics"},
		{"ELC-PB-01", "Power Bank 10000mAh", 49900, 22000, "Electronics"},
		{"ELC-USB-01", "USB-C Cable 1m", 19900, 5000, "Electronics"},
	}

	for _, p := range productData {
		id := primitive.NewObjectID().Hex()
		productIDs[p.sku] = id
		prod := models.Product{
			ID:         id,
			OrgID:      orgID,
			SKU:        p.sku,
			Name:       p.name,
			Price:      p.price,
			Cost:       p.cost,
			Category:   p.category,
			CategoryID: categoryIDs[p.category],
		}
		r.CreateProduct(ctx, prod)
	}
	fmt.Printf("  Created %d products\n", len(productData))

	// ========== CUSTOMERS ==========
	customerData := []struct {
		name    string
		phone   string
		email   string
		address string
	}{
		{"Somchai Jaidee", "081-234-5678", "somchai@email.com", "123 Sukhumvit Rd, Bangkok"},
		{"Somporn Rakdee", "082-345-6789", "somporn@email.com", "456 Silom Rd, Bangkok"},
		{"Wanida Supap", "083-456-7890", "wanida@email.com", "789 Ratchada Rd, Bangkok"},
		{"Prasert Thongdee", "084-567-8901", "prasert@email.com", "321 Phahonyothin Rd, Bangkok"},
		{"Nittaya Samart", "085-678-9012", "nittaya@email.com", "654 Rama 9 Rd, Bangkok"},
		{"ABC Trading Co., Ltd", "02-123-4567", "purchase@abctrading.co.th", "100 Industrial Estate, Samutprakan"},
		{"XYZ Retail Group", "02-234-5678", "orders@xyzretail.co.th", "200 Commerce Park, Nonthaburi"},
		{"Pimchan Boonmee", "086-789-0123", "pimchan@email.com", "987 Ladprao Rd, Bangkok"},
	}

	for _, c := range customerData {
		id := primitive.NewObjectID().Hex()
		customerIDs = append(customerIDs, id)
		cust := models.Customer{
			ID:      id,
			OrgID:   orgID,
			Name:    c.name,
			Phone:   c.phone,
			Email:   c.email,
			Address: c.address,
		}
		r.CreateCustomer(ctx, cust)
	}
	fmt.Printf("  Created %d customers\n", len(customerData))

	// ========== SUPPLIERS ==========
	supplierData := []struct {
		name        string
		contactName string
		phone       string
		email       string
		address     string
	}{
		{"Fashion Wholesale Co.", "Khun Arun", "02-111-2222", "sales@fashionwholesale.co.th", "Pratunam Market, Bangkok"},
		{"Home Goods Import Ltd.", "Khun Boonma", "02-222-3333", "orders@homegoodsimport.co.th", "Chatuchak, Bangkok"},
		{"Organic Foods Ltd.", "Khun Chanida", "02-333-4444", "supply@organicfoods.co.th", "Pak Kret, Nonthaburi"},
		{"Tech Accessories Inc.", "Khun Danai", "02-444-5555", "wholesale@techacc.co.th", "Pantip Plaza, Bangkok"},
	}

	for _, s := range supplierData {
		id := primitive.NewObjectID().Hex()
		supplierIDs[s.name] = id
		supp := models.Supplier{
			ID:          id,
			OrgID:       orgID,
			Name:        s.name,
			ContactName: s.contactName,
			Phone:       s.phone,
			Email:       s.email,
			Address:     s.address,
		}
		r.CreateSupplier(ctx, supp)
	}
	fmt.Printf("  Created %d suppliers\n", len(supplierData))

	// ========== PURCHASE ORDERS ==========
	// PO-1: Clothing from Fashion Wholesale (RECEIVED)
	po1ID := primitive.NewObjectID().Hex()
	poIDs["PO-000001"] = po1ID
	po1Items := []models.PurchaseOrderItem{
		{ProductID: productIDs["CLO-TS-S"], ProductName: "Basic T-Shirt (S)", Quantity: 50, UnitCost: 15000},
		{ProductID: productIDs["CLO-TS-M"], ProductName: "Basic T-Shirt (M)", Quantity: 100, UnitCost: 15000},
		{ProductID: productIDs["CLO-TS-L"], ProductName: "Basic T-Shirt (L)", Quantity: 50, UnitCost: 15000},
		{ProductID: productIDs["CLO-JN-01"], ProductName: "Classic Denim Jeans", Quantity: 30, UnitCost: 55000},
	}
	r.CreatePurchaseOrder(ctx, models.PurchaseOrder{
		ID: po1ID, OrgID: orgID, BranchID: branchID, ReferenceNo: "PO-000001",
		Date: now.AddDate(0, 0, -30).Format(time.RFC3339), SupplierID: supplierIDs["Fashion Wholesale Co."], Status: "RECEIVED",
		Items: po1Items, TotalCost: 4650000, ReceivedDate: now.AddDate(0, 0, -28).Format(time.RFC3339),
	})

	// PO-2: Home goods from Home Goods Import (RECEIVED)
	po2ID := primitive.NewObjectID().Hex()
	poIDs["PO-000002"] = po2ID
	po2Items := []models.PurchaseOrderItem{
		{ProductID: productIDs["HOM-PL-01"], ProductName: "Memory Foam Pillow", Quantity: 40, UnitCost: 25000},
		{ProductID: productIDs["HOM-TW-01"], ProductName: "Cotton Towel Set (3pc)", Quantity: 30, UnitCost: 20000},
		{ProductID: productIDs["HOM-CN-01"], ProductName: "Scented Candle - Lavender", Quantity: 60, UnitCost: 8000},
	}
	r.CreatePurchaseOrder(ctx, models.PurchaseOrder{
		ID: po2ID, OrgID: orgID, BranchID: branchID, ReferenceNo: "PO-000002",
		Date: now.AddDate(0, 0, -20).Format(time.RFC3339), SupplierID: supplierIDs["Home Goods Import Ltd."], Status: "RECEIVED",
		Items: po2Items, TotalCost: 2080000, ReceivedDate: now.AddDate(0, 0, -18).Format(time.RFC3339),
	})

	// PO-3: Electronics from Tech Accessories (OPEN)
	po3ID := primitive.NewObjectID().Hex()
	poIDs["PO-000003"] = po3ID
	po3Items := []models.PurchaseOrderItem{
		{ProductID: productIDs["ELC-SP-01"], ProductName: "Bluetooth Speaker Mini", Quantity: 25, UnitCost: 35000},
		{ProductID: productIDs["ELC-PB-01"], ProductName: "Power Bank 10000mAh", Quantity: 50, UnitCost: 22000},
		{ProductID: productIDs["ELC-USB-01"], ProductName: "USB-C Cable 1m", Quantity: 100, UnitCost: 5000},
	}
	r.CreatePurchaseOrder(ctx, models.PurchaseOrder{
		ID: po3ID, OrgID: orgID, BranchID: branchID, ReferenceNo: "PO-000003",
		Date: now.AddDate(0, 0, -5).Format(time.RFC3339), SupplierID: supplierIDs["Tech Accessories Inc."], Status: "OPEN",
		Items: po3Items, TotalCost: 2475000,
	})

	// PO-4: Food items from Organic Foods (OPEN)
	po4ID := primitive.NewObjectID().Hex()
	poIDs["PO-000004"] = po4ID
	po4Items := []models.PurchaseOrderItem{
		{ProductID: productIDs["FOD-CF-01"], ProductName: "Premium Coffee Beans 500g", Quantity: 40, UnitCost: 18000},
		{ProductID: productIDs["FOD-HN-01"], ProductName: "Organic Honey 350g", Quantity: 30, UnitCost: 15000},
		{ProductID: productIDs["FOD-TE-01"], ProductName: "Green Tea Gift Set", Quantity: 25, UnitCost: 22000},
	}
	r.CreatePurchaseOrder(ctx, models.PurchaseOrder{
		ID: po4ID, OrgID: orgID, BranchID: branchID, ReferenceNo: "PO-000004",
		Date: now.AddDate(0, 0, -3).Format(time.RFC3339), SupplierID: supplierIDs["Organic Foods Ltd."], Status: "OPEN",
		Items: po4Items, TotalCost: 1720000,
	})

	// PO-5: Cancelled order
	po5ID := primitive.NewObjectID().Hex()
	poIDs["PO-000005"] = po5ID
	r.CreatePurchaseOrder(ctx, models.PurchaseOrder{
		ID: po5ID, OrgID: orgID, BranchID: branchID, ReferenceNo: "PO-000005",
		Date: now.AddDate(0, 0, -45).Format(time.RFC3339), SupplierID: supplierIDs["Fashion Wholesale Co."], Status: "CANCELLED",
		Items: []models.PurchaseOrderItem{
			{ProductID: productIDs["CLO-SN-01"], ProductName: "Canvas Sneakers", Quantity: 20, UnitCost: 35000},
		},
		TotalCost: 700000, Note: "Cancelled - supplier out of stock",
	})
	fmt.Println("  Created 5 purchase orders")

	// ========== INVENTORY LOTS ==========
	lotIDs := make(map[string]string) // key -> ID for reference

	// Lots from PO-1 (received 28 days ago)
	lotsFromPO1 := []struct {
		key       string
		productID string
		qty       int
		remaining int
		cost      int64
	}{
		{"lot-ts-s", productIDs["CLO-TS-S"], 50, 35, 15000},
		{"lot-ts-m", productIDs["CLO-TS-M"], 100, 72, 15000},
		{"lot-ts-l", productIDs["CLO-TS-L"], 50, 40, 15000},
		{"lot-jeans", productIDs["CLO-JN-01"], 30, 18, 55000},
	}
	for _, l := range lotsFromPO1 {
		id := primitive.NewObjectID().Hex()
		lotIDs[l.key] = id
		r.CreateInventoryLot(ctx, models.InventoryLot{
			ID: id, OrgID: orgID, BranchID: branchID, ProductID: l.productID,
			Source: "PO", PurchaseOrderID: po1ID, ReferenceNo: "PO-000001",
			UnitCost: l.cost, QtyReceived: l.qty, QtyRemaining: l.remaining,
			ReceivedAt: now.AddDate(0, 0, -28),
		})
	}

	// Lots from PO-2 (received 18 days ago)
	lotsFromPO2 := []struct {
		key       string
		productID string
		qty       int
		remaining int
		cost      int64
	}{
		{"lot-pillow", productIDs["HOM-PL-01"], 40, 28, 25000},
		{"lot-towel", productIDs["HOM-TW-01"], 30, 22, 20000},
		{"lot-candle", productIDs["HOM-CN-01"], 60, 45, 8000},
	}
	for _, l := range lotsFromPO2 {
		id := primitive.NewObjectID().Hex()
		lotIDs[l.key] = id
		r.CreateInventoryLot(ctx, models.InventoryLot{
			ID: id, OrgID: orgID, BranchID: branchID, ProductID: l.productID,
			Source: "PO", PurchaseOrderID: po2ID, ReferenceNo: "PO-000002",
			UnitCost: l.cost, QtyReceived: l.qty, QtyRemaining: l.remaining,
			ReceivedAt: now.AddDate(0, 0, -18),
		})
	}

	// Initial stock lots (various products)
	initialLots := []struct {
		productID string
		qty       int
		remaining int
		cost      int64
		daysAgo   int
	}{
		{productIDs["CLO-SN-01"], 25, 15, 35000, 60},
		{productIDs["CLO-CP-01"], 40, 32, 10000, 60},
		{productIDs["FOD-CF-01"], 30, 12, 18000, 30},
		{productIDs["ELC-SP-01"], 15, 8, 35000, 30},
		{productIDs["ELC-PB-01"], 20, 5, 22000, 30},
		{productIDs["ELC-USB-01"], 50, 38, 5000, 30},
	}
	for _, l := range initialLots {
		id := primitive.NewObjectID().Hex()
		r.CreateInventoryLot(ctx, models.InventoryLot{
			ID: id, OrgID: orgID, BranchID: branchID, ProductID: l.productID,
			Source: "INITIAL", UnitCost: l.cost,
			QtyReceived: l.qty, QtyRemaining: l.remaining,
			ReceivedAt: now.AddDate(0, 0, -l.daysAgo),
		})
	}

	// Branch 2 lots (from transfer)
	branch2Lots := []struct {
		productID string
		qty       int
		remaining int
		cost      int64
	}{
		{productIDs["CLO-TS-M"], 20, 15, 15000},
		{productIDs["CLO-JN-01"], 10, 3, 55000},
	}
	for _, l := range branch2Lots {
		id := primitive.NewObjectID().Hex()
		r.CreateInventoryLot(ctx, models.InventoryLot{
			ID: id, OrgID: orgID, BranchID: branch2ID, ProductID: l.productID,
			Source: "TRANSFER", UnitCost: l.cost,
			QtyReceived: l.qty, QtyRemaining: l.remaining,
			ReceivedAt: now.AddDate(0, 0, -14),
		})
	}
	fmt.Println("  Created 15 inventory lots")

	// ========== STOCK LEVELS ==========
	stockLevels := []struct {
		branchID  string
		sku       string
		quantity  int
		minStock  int
	}{
		// Main Branch - in stock
		{branchID, "CLO-TS-S", 35, 10},
		{branchID, "CLO-TS-M", 72, 20},
		{branchID, "CLO-TS-L", 40, 10},
		{branchID, "CLO-JN-01", 18, 10},
		{branchID, "CLO-SN-01", 15, 10},
		{branchID, "CLO-CP-01", 32, 15},
		{branchID, "HOM-PL-01", 28, 10},
		{branchID, "HOM-TW-01", 22, 10},
		{branchID, "HOM-CN-01", 45, 15},
		{branchID, "ELC-USB-01", 38, 20},
		// Main Branch - low stock
		{branchID, "FOD-CF-01", 12, 15},
		{branchID, "ELC-SP-01", 8, 10},
		{branchID, "ELC-PB-01", 5, 15},
		// Main Branch - out of stock
		{branchID, "HOM-FR-01", 0, 10},
		{branchID, "HOM-SB-01", 0, 10},
		{branchID, "FOD-HN-01", 0, 10},
		{branchID, "FOD-SN-01", 0, 10},
		{branchID, "FOD-TE-01", 0, 10},
		{branchID, "BTY-SP-01", 0, 10},
		{branchID, "BTY-LT-01", 0, 10},
		{branchID, "BTY-PF-01", 0, 5},
		// Branch 2
		{branch2ID, "CLO-TS-M", 15, 10},
		{branch2ID, "CLO-JN-01", 3, 5},
	}
	for _, sl := range stockLevels {
		productID := productIDs[sl.sku]
		r.AdjustStock(ctx, orgID, sl.branchID, productID, sl.quantity)
		patch := map[string]interface{}{"minStock": sl.minStock}
		r.PatchStockLevel(ctx, orgID, sl.branchID, productID, patch)
	}
	fmt.Printf("  Created %d stock levels\n", len(stockLevels))

	// ========== STOCK MOVEMENTS ==========
	movementTypes := []string{"SALE", "ADJUSTMENT", "TRANSFER_OUT", "TRANSFER_IN", "STOCK_IN"}
	movementReasons := []string{"Customer order", "Stock adjustment", "Inventory count", "Damaged goods", "Return to supplier"}

	// Create realistic movements over past 30 days
	for i := 0; i < 50; i++ {
		daysAgo := rng.Intn(30)
		movType := movementTypes[rng.Intn(len(movementTypes))]

		// Pick a random product that has stock
		skuList := []string{"CLO-TS-S", "CLO-TS-M", "CLO-TS-L", "CLO-JN-01", "HOM-PL-01", "HOM-CN-01", "ELC-USB-01"}
		sku := skuList[rng.Intn(len(skuList))]
		productID := productIDs[sku]

		var quantity int
		switch movType {
		case "SALE", "TRANSFER_OUT":
			quantity = -(rng.Intn(5) + 1)
		case "STOCK_IN", "TRANSFER_IN":
			quantity = rng.Intn(20) + 5
		case "ADJUSTMENT":
			quantity = rng.Intn(10) - 5
		}

		prevQty := rng.Intn(50) + 10
		newQty := prevQty + quantity
		if newQty < 0 {
			newQty = 0
		}

		movID := primitive.NewObjectID().Hex()
		r.CreateStockMovement(ctx, models.StockMovement{
			ID:               movID,
			OrgID:            orgID,
			BranchID:         branchID,
			ProductID:        productID,
			Type:             movType,
			Quantity:         quantity,
			PreviousQuantity: prevQty,
			NewQuantity:      newQty,
			Reason:           movementReasons[rng.Intn(len(movementReasons))],
			CreatedBy:        userID,
			CreatedAt:        now.AddDate(0, 0, -daysAgo),
		})
	}
	fmt.Println("  Created 50 stock movements")

	// ========== STOCK TRANSFERS ==========
	// Transfer 1: Completed (RECEIVED)
	trf1ID := primitive.NewObjectID().Hex()
	r.CreateStockTransfer(ctx, models.StockTransfer{
		ID: trf1ID, OrgID: orgID, TransferNumber: "TRF-000001",
		FromBranchID: branchID, ToBranchID: branch2ID, Status: "RECEIVED",
		Items: []models.StockTransferItem{
			{ProductID: productIDs["CLO-TS-M"], ProductName: "Basic T-Shirt (M)", ProductSKU: "CLO-TS-M", Quantity: 20, ReceivedQuantity: 20},
			{ProductID: productIDs["CLO-JN-01"], ProductName: "Classic Denim Jeans", ProductSKU: "CLO-JN-01", Quantity: 10, ReceivedQuantity: 10},
		},
		CreatedBy: userID, SentAt: now.AddDate(0, 0, -15), ReceivedAt: now.AddDate(0, 0, -14), ReceivedBy: userID,
	})

	// Transfer 2: In transit
	trf2ID := primitive.NewObjectID().Hex()
	r.CreateStockTransfer(ctx, models.StockTransfer{
		ID: trf2ID, OrgID: orgID, TransferNumber: "TRF-000002",
		FromBranchID: branchID, ToBranchID: branch2ID, Status: "IN_TRANSIT",
		Items: []models.StockTransferItem{
			{ProductID: productIDs["HOM-PL-01"], ProductName: "Memory Foam Pillow", ProductSKU: "HOM-PL-01", Quantity: 5},
			{ProductID: productIDs["HOM-CN-01"], ProductName: "Scented Candle - Lavender", ProductSKU: "HOM-CN-01", Quantity: 10},
		},
		CreatedBy: userID, SentAt: now.AddDate(0, 0, -1),
	})

	// Transfer 3: Draft
	trf3ID := primitive.NewObjectID().Hex()
	r.CreateStockTransfer(ctx, models.StockTransfer{
		ID: trf3ID, OrgID: orgID, TransferNumber: "TRF-000003",
		FromBranchID: branchID, ToBranchID: branch2ID, Status: "DRAFT",
		Items: []models.StockTransferItem{
			{ProductID: productIDs["ELC-SP-01"], ProductName: "Bluetooth Speaker Mini", ProductSKU: "ELC-SP-01", Quantity: 3},
		},
		CreatedBy: userID,
	})
	fmt.Println("  Created 3 stock transfers")

	// ========== ORDERS/TRANSACTIONS ==========
	_ = []string{"WEB", "POS", "SHOPEE", "LAZADA", "TIKTOK", "LINE"} // channels defined in orderConfigs
	paymentMethods := []string{"CASH", "CREDIT_CARD", "BANK_TRANSFER", "PROMPTPAY", "COD"}
	carriers := []string{"Kerry Express", "Flash Express", "J&T Express", "Thailand Post", "DHL"}

	// Helper to generate tracking number
	genTracking := func(carrier string) string {
		prefix := map[string]string{
			"Kerry Express":  "KRRY",
			"Flash Express":  "FLSH",
			"J&T Express":    "JT",
			"Thailand Post":  "TP",
			"DHL":            "DHL",
		}[carrier]
		return fmt.Sprintf("%s%d", prefix, 10000000+rng.Intn(90000000))
	}

	// Create 15 orders with varying statuses and complete recipient info
	orderConfigs := []struct {
		daysAgo           int
		status            string
		fulfillmentStatus string
		channel           string
		customerIdx       int // -1 for walk-in
		recipientAddress  string
		items             []struct {
			sku   string
			qty   int
			price int64
		}
	}{
		// Delivered orders (completed)
		{25, "COMPLETED", "DELIVERED", "WEB", 0, "123 Sukhumvit Rd, Wattana, Bangkok 10110", []struct{ sku string; qty int; price int64 }{{"CLO-TS-M", 2, 39900}, {"CLO-JN-01", 1, 129900}}},
		{22, "COMPLETED", "DELIVERED", "POS", -1, "", []struct{ sku string; qty int; price int64 }{{"FOD-CF-01", 3, 34900}, {"HOM-CN-01", 2, 24900}}},
		{18, "COMPLETED", "DELIVERED", "SHOPEE", 1, "456 Silom Rd, Bangrak, Bangkok 10500", []struct{ sku string; qty int; price int64 }{{"ELC-SP-01", 1, 79900}, {"ELC-PB-01", 2, 49900}}},
		{15, "COMPLETED", "DELIVERED", "LAZADA", 2, "789 Ratchada Rd, Huai Khwang, Bangkok 10310", []struct{ sku string; qty int; price int64 }{{"HOM-PL-01", 2, 59900}, {"HOM-TW-01", 1, 49900}}},
		{10, "COMPLETED", "DELIVERED", "WEB", 5, "100 Industrial Estate, Samutprakan 10270", []struct{ sku string; qty int; price int64 }{{"CLO-TS-S", 10, 35900}, {"CLO-TS-M", 20, 35900}, {"CLO-CP-01", 5, 26900}}},
		// Shipped orders
		{5, "CONFIRMED", "SHIPPED", "SHOPEE", 3, "321 Phahonyothin Rd, Chatuchak, Bangkok 10900", []struct{ sku string; qty int; price int64 }{{"CLO-SN-01", 1, 89900}, {"ELC-USB-01", 2, 19900}}},
		{4, "CONFIRMED", "SHIPPED", "LAZADA", 4, "654 Rama 9 Rd, Suan Luang, Bangkok 10250", []struct{ sku string; qty int; price int64 }{{"HOM-PL-01", 1, 59900}}},
		{3, "CONFIRMED", "SHIPPED", "TIKTOK", -1, "99 Pracha Uthit Rd, Thung Khru, Bangkok 10140", []struct{ sku string; qty int; price int64 }{{"HOM-CN-01", 3, 24900}}},
		{3, "CONFIRMED", "SHIPPED", "WEB", 7, "987 Ladprao Rd, Wang Thonglang, Bangkok 10310", []struct{ sku string; qty int; price int64 }{{"CLO-JN-01", 2, 129900}, {"CLO-TS-L", 3, 39900}}},
		{2, "CONFIRMED", "SHIPPED", "LINE", -1, "55 Ekkamai Soi 10, Wattana, Bangkok 10110", []struct{ sku string; qty int; price int64 }{{"ELC-SP-01", 2, 79900}}},
		// Pending orders (awaiting processing)
		{1, "PENDING", "PENDING", "WEB", 6, "200 Commerce Park, Nonthaburi 11000", []struct{ sku string; qty int; price int64 }{{"HOM-TW-01", 10, 44900}, {"HOM-PL-01", 8, 54900}}},
		{0, "PENDING", "PENDING", "SHOPEE", -1, "42 Soi Sukhumvit 39, Wattana, Bangkok 10110", []struct{ sku string; qty int; price int64 }{{"ELC-PB-01", 1, 49900}, {"ELC-USB-01", 3, 19900}}},
		{0, "PENDING", "PENDING", "POS", -1, "", []struct{ sku string; qty int; price int64 }{{"CLO-TS-M", 1, 39900}}},
		// Cancelled orders
		{12, "CANCELLED", "PENDING", "LAZADA", -1, "111 Ngamwongwan Rd, Nonthaburi 11000", []struct{ sku string; qty int; price int64 }{{"CLO-SN-01", 2, 89900}}},
		{8, "CANCELLED", "PENDING", "SHOPEE", -1, "222 Pinklao Rd, Bangkok Noi, Bangkok 10700", []struct{ sku string; qty int; price int64 }{{"CLO-JN-01", 1, 129900}}},
	}

	for i, cfg := range orderConfigs {
		orderID := primitive.NewObjectID().Hex()

		// Build items
		var items []models.TransactionItem
		var total, cogs int64
		for _, item := range cfg.items {
			prodID := productIDs[item.sku]
			// Find cost from product data
			var cost int64
			for _, p := range productData {
				if p.sku == item.sku {
					cost = p.cost
					break
				}
			}
			items = append(items, models.TransactionItem{
				ID:       prodID,
				SKU:      item.sku,
				Name:     getProductName(item.sku, productData),
				Price:    item.price,
				Cost:     cost,
				Quantity: item.qty,
			})
			total += item.price * int64(item.qty)
			cogs += cost * int64(item.qty)
		}

		// Customer info
		var customerID, recipientName, recipientPhone, recipientAddress string
		if cfg.customerIdx >= 0 && cfg.customerIdx < len(customerData) {
			customerID = customerIDs[cfg.customerIdx]
			recipientName = customerData[cfg.customerIdx].name
			recipientPhone = customerData[cfg.customerIdx].phone
			recipientAddress = cfg.recipientAddress
			if recipientAddress == "" {
				recipientAddress = customerData[cfg.customerIdx].address
			}
		} else {
			recipientName = "Walk-in Customer"
			recipientPhone = fmt.Sprintf("08%d-%03d-%04d", rng.Intn(10), rng.Intn(1000), rng.Intn(10000))
			recipientAddress = cfg.recipientAddress
		}

		order := models.Transaction{
			ID:                orderID,
			OrgID:             orgID,
			BranchID:          branchID,
			Date:              now.AddDate(0, 0, -cfg.daysAgo).Format(time.RFC3339),
			Channel:           cfg.channel,
			Type:              "SALE",
			Status:            cfg.status,
			FulfillmentStatus: cfg.fulfillmentStatus,
			CustomerID:        customerID,
			RecipientName:     recipientName,
			RecipientPhone:    recipientPhone,
			RecipientAddress:  recipientAddress,
			Items:             items,
			Total:             total,
			COGS:              cogs,
			Profit:            total - cogs,
			PaymentMethod:     paymentMethods[rng.Intn(len(paymentMethods))],
			UserID:            userID,
			StockCommitted:    cfg.status == "COMPLETED" || cfg.status == "CONFIRMED",
		}

		// Add shipping info for shipped orders
		if cfg.fulfillmentStatus == "SHIPPED" {
			carrier := carriers[rng.Intn(len(carriers))]
			order.ShippingInfo = &models.ShippingInfo{
				Carrier:        carrier,
				TrackingNumber: genTracking(carrier),
			}
		}

		// Add cancellation reason
		if cfg.status == "CANCELLED" {
			reasons := []string{"Customer requested cancellation", "Out of stock", "Payment not received", "Duplicate order"}
			order.CancellationReason = reasons[rng.Intn(len(reasons))]
		}

		// Add note for wholesale orders
		if i == 4 {
			order.Note = "Wholesale order - 10% discount applied"
		}
		if i == 10 {
			order.Note = "Wholesale order - awaiting payment confirmation"
		}

		r.CreateTransaction(ctx, order)
	}
	fmt.Println("  Created 15 orders/transactions")

	fmt.Println("Demo data seeded successfully!")
}

// Helper to get product name from SKU
func getProductName(sku string, products []struct {
	sku      string
	name     string
	price    int64
	cost     int64
	category string
}) string {
	for _, p := range products {
		if p.sku == sku {
			return p.name
		}
	}
	return sku
}
