package repo

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (r *Repo) EnsureIndexes(ctx context.Context) error {
	indexes := []struct {
		col  string
		name string
		keys bson.D
		opts *options.IndexOptions
	}{
		{col: ColUsers, name: "users_email_unique", keys: bson.D{{Key: "email", Value: 1}}, opts: options.Index().SetUnique(true)},
		{col: ColBranches, name: "branches_orgId", keys: bson.D{{Key: "orgId", Value: 1}}, opts: options.Index()},
		{col: ColProducts, name: "products_orgId", keys: bson.D{{Key: "orgId", Value: 1}}, opts: options.Index()},
		{col: ColProducts, name: "products_orgId_sku_unique", keys: bson.D{{Key: "orgId", Value: 1}, {Key: "sku", Value: 1}}, opts: options.Index().SetUnique(true)},
		{col: ColStockLevels, name: "stock_orgId", keys: bson.D{{Key: "orgId", Value: 1}}, opts: options.Index()},
		{
			col:  ColInventoryLots,
			name: "lots_org_branch_product_receivedAt_open",
			keys: bson.D{
				{Key: "orgId", Value: 1},
				{Key: "branchId", Value: 1},
				{Key: "productId", Value: 1},
				{Key: "receivedAt", Value: 1},
				{Key: "_id", Value: 1},
			},
			opts: options.Index().SetPartialFilterExpression(bson.M{"qtyRemaining": bson.M{"$gt": 0}}),
		},
		{col: ColInventoryLots, name: "lots_org_po", keys: bson.D{{Key: "orgId", Value: 1}, {Key: "purchaseOrderId", Value: 1}}, opts: options.Index()},
		{col: ColCustomers, name: "customers_orgId", keys: bson.D{{Key: "orgId", Value: 1}}, opts: options.Index()},
		{col: ColSuppliers, name: "suppliers_orgId", keys: bson.D{{Key: "orgId", Value: 1}}, opts: options.Index()},
		{col: ColPurchaseOrders, name: "po_orgId", keys: bson.D{{Key: "orgId", Value: 1}}, opts: options.Index()},
		{col: ColPurchaseOrders, name: "po_orgId_ref_unique", keys: bson.D{{Key: "orgId", Value: 1}, {Key: "referenceNo", Value: 1}}, opts: options.Index().SetUnique(true)},
		{col: ColTransactions, name: "txn_orgId_date", keys: bson.D{{Key: "orgId", Value: 1}, {Key: "date", Value: -1}}, opts: options.Index()},
	}

	for _, idx := range indexes {
		_, err := r.col(idx.col).Indexes().CreateOne(ctx, mongo.IndexModel{
			Keys:    idx.keys,
			Options: idx.opts.SetName(idx.name),
		})
		if err != nil {
			return err
		}
	}

	return nil
}
