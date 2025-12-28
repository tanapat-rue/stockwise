package costing

import (
	"context"
	"errors"

	"stockflows/server/internal/models"
	"stockflows/server/internal/repo"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

var (
	ErrInvalidQuantity = errors.New("quantity must be positive")
	ErrNoCostData      = errors.New("no cost data available for product")
)

// Service handles cost calculations for inventory
type Service struct {
	repo *repo.Repo
}

// New creates a new costing service
func New(r *repo.Repo) *Service {
	return &Service{repo: r}
}

// CalculateMovingAverage computes new weighted average cost
// Formula: newAvg = (oldQty*oldAvg + newQty*newCost) / (oldQty+newQty)
func CalculateMovingAverage(oldQty int, oldAvgCost int64, newQty int, newUnitCost int64) int64 {
	if oldQty+newQty <= 0 {
		return newUnitCost
	}
	totalValue := int64(oldQty)*oldAvgCost + int64(newQty)*newUnitCost
	return totalValue / int64(oldQty+newQty)
}

// COGSResult contains the result of COGS calculation
type COGSResult struct {
	CostLines []models.CostLine
	TotalCOGS int64
	UnitCost  int64
}

// ComputeCOGS calculates cost of goods sold based on product's costing method
func (s *Service) ComputeCOGS(ctx context.Context, orgID, branchID string, product models.Product, qty int) (COGSResult, error) {
	if qty <= 0 {
		return COGSResult{}, ErrInvalidQuantity
	}

	method := product.CostingMethod
	if method == "" {
		method = models.CostingMethodFIFO // Default to FIFO
	}

	switch method {
	case models.CostingMethodMovingAverage:
		return s.computeMovingAverageCOGS(ctx, orgID, branchID, product, qty)
	default:
		return s.computeFIFOCOGS(ctx, orgID, branchID, product.ID, qty)
	}
}

// computeFIFOCOGS uses existing FIFO lot consumption
func (s *Service) computeFIFOCOGS(ctx context.Context, orgID, branchID, productID string, qty int) (COGSResult, error) {
	lines, cogs, err := s.repo.ConsumeLotsFIFO(ctx, orgID, branchID, productID, qty)
	if err != nil {
		return COGSResult{}, err
	}

	unitCost := int64(0)
	if qty > 0 {
		unitCost = cogs / int64(qty)
	}

	return COGSResult{
		CostLines: lines,
		TotalCOGS: cogs,
		UnitCost:  unitCost,
	}, nil
}

// computeMovingAverageCOGS uses weighted average cost
func (s *Service) computeMovingAverageCOGS(ctx context.Context, orgID, branchID string, product models.Product, qty int) (COGSResult, error) {
	// Get average cost - prefer branch-level, fall back to product-level
	avgCost := product.AverageCost
	if avgCost == 0 {
		// Try to get from stock level
		sl, err := s.repo.GetStockLevel(ctx, orgID, branchID, product.ID)
		if err == nil && sl.AverageCost > 0 {
			avgCost = sl.AverageCost
		}
	}

	// If no average cost, fall back to product's last cost
	if avgCost == 0 {
		avgCost = product.Cost
	}

	// If still no cost, return error
	if avgCost == 0 {
		return COGSResult{}, ErrNoCostData
	}

	cogs := avgCost * int64(qty)

	// Create a synthetic cost line for moving average
	line := models.CostLine{
		LotID:    "AVERAGE",
		Quantity: qty,
		UnitCost: avgCost,
		Amount:   cogs,
	}

	return COGSResult{
		CostLines: []models.CostLine{line},
		TotalCOGS: cogs,
		UnitCost:  avgCost,
	}, nil
}

// UpdateMovingAverageOnReceive updates product and stock level average cost when receiving stock
func (s *Service) UpdateMovingAverageOnReceive(ctx context.Context, orgID, branchID, productID string, receivedQty int, unitCost int64) error {
	if receivedQty <= 0 {
		return ErrInvalidQuantity
	}

	// Get current product
	product, err := s.repo.GetProductByOrg(ctx, orgID, productID)
	if err != nil {
		return err
	}

	// Skip if not using moving average
	if product.CostingMethod != models.CostingMethodMovingAverage {
		return nil
	}

	// Get current stock level
	sl, err := s.repo.GetStockLevel(ctx, orgID, branchID, productID)
	if err != nil && !errors.Is(err, repo.ErrNotFound) {
		return err
	}

	// Calculate current quantity (before this receive)
	currentQty := 0
	currentAvgCost := product.AverageCost
	if err == nil {
		currentQty = sl.Quantity
		if sl.AverageCost > 0 {
			currentAvgCost = sl.AverageCost
		}
	}

	// Calculate new average
	newAvgCost := CalculateMovingAverage(currentQty, currentAvgCost, receivedQty, unitCost)

	// Update product-level average cost and total quantity
	newTotalQty := product.TotalQuantity + receivedQty
	_, err = s.repo.UpdateProductByOrg(ctx, orgID, productID, bson.M{
		"averageCost":   newAvgCost,
		"totalQuantity": newTotalQty,
	})
	if err != nil {
		return err
	}

	// Update stock level average cost
	_, err = s.repo.PatchStockLevel(ctx, orgID, branchID, productID, bson.M{
		"averageCost": newAvgCost,
	})

	return err
}

// UpdateMovingAverageOnSale decrements product total quantity after sale
func (s *Service) UpdateMovingAverageOnSale(ctx context.Context, orgID, productID string, soldQty int) error {
	if soldQty <= 0 {
		return ErrInvalidQuantity
	}

	// Get current product
	product, err := s.repo.GetProductByOrg(ctx, orgID, productID)
	if err != nil {
		return err
	}

	// Skip if not using moving average
	if product.CostingMethod != models.CostingMethodMovingAverage {
		return nil
	}

	// Update total quantity
	newTotalQty := product.TotalQuantity - soldQty
	if newTotalQty < 0 {
		newTotalQty = 0
	}

	_, err = s.repo.UpdateProductByOrg(ctx, orgID, productID, bson.M{
		"totalQuantity": newTotalQty,
	})

	return err
}

// MigrateToMovingAverage calculates initial average from existing FIFO lots
// This should be called when switching a product from FIFO to Moving Average
func (s *Service) MigrateToMovingAverage(ctx context.Context, orgID, branchID, productID string) (int64, error) {
	// Get all remaining lots for this product
	lots, err := s.repo.ListProductLots(ctx, orgID, productID, branchID)
	if err != nil {
		return 0, err
	}

	if len(lots) == 0 {
		// No lots, get from product cost
		product, err := s.repo.GetProductByOrg(ctx, orgID, productID)
		if err != nil {
			return 0, err
		}
		return product.Cost, nil
	}

	// Calculate weighted average from all remaining lots
	var totalValue int64
	var totalQty int
	for _, lot := range lots {
		if lot.QtyRemaining > 0 {
			totalValue += int64(lot.QtyRemaining) * lot.UnitCost
			totalQty += lot.QtyRemaining
		}
	}

	if totalQty == 0 {
		product, err := s.repo.GetProductByOrg(ctx, orgID, productID)
		if err != nil {
			return 0, err
		}
		return product.Cost, nil
	}

	avgCost := totalValue / int64(totalQty)

	// Update product with calculated average
	_, err = s.repo.UpdateProductByOrg(ctx, orgID, productID, bson.M{
		"averageCost":   avgCost,
		"totalQuantity": totalQty,
		"costingMethod": models.CostingMethodMovingAverage,
	})
	if err != nil {
		return 0, err
	}

	// Update stock level average
	_, _ = s.repo.PatchStockLevel(ctx, orgID, branchID, productID, bson.M{
		"averageCost": avgCost,
	})

	return avgCost, nil
}

// CreateAdjustmentLotIfNeeded creates an adjustment lot when FIFO lots are insufficient
// Returns true if lot was created
func (s *Service) CreateAdjustmentLotIfNeeded(ctx context.Context, orgID, branchID, productID string, neededQty int) (bool, error) {
	product, err := s.repo.GetProductByOrg(ctx, orgID, productID)
	if err != nil {
		return false, err
	}

	// Create adjustment lot using product's cost
	_, err = s.repo.CreateInventoryLot(ctx, models.InventoryLot{
		ID:           primitive.NewObjectID().Hex(),
		OrgID:        orgID,
		BranchID:     branchID,
		ProductID:    productID,
		Source:       "ADJUSTMENT",
		UnitCost:     product.Cost,
		QtyReceived:  neededQty,
		QtyRemaining: neededQty,
		ReceivedAt:   time.Now().UTC(),
	})

	return err == nil, err
}
