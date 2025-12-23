package datatables

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type SelectFunc func(DataTablesParam) (data any, filtered int64, total int64, err error)

// HandleRequest is an optional Gin helper that parses DataTables payloads and
// writes the standard DataTables JSON response.
func HandleRequest(c *gin.Context, f SelectFunc) {
	var param DataTablesParam
	if err := c.ShouldBindJSON(&param); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "invalid request payload",
		})
		return
	}

	data, filtered, total, err := f(param)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{
			"status":  "error",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, DataTablesResponse{
		Draw:     param.Draw,
		Total:    total,
		Filtered: filtered,
		Data:     data,
	})
}
