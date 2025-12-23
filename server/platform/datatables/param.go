package datatables

type SelectTableParam struct {
	SelectAll    bool     `json:"selectAll"`
	SelectList   []string `json:"selected"`
	DeselectList []string `json:"deselected"`
}

type DataTablesResponse struct {
	Draw     int   `json:"draw"`
	Total    int64 `json:"recordsTotal"`
	Filtered int64 `json:"recordsFiltered"`
	Data     any   `json:"data"`
}

type OrderParam struct {
	Column int    `json:"column"`
	Dir    string `json:"dir"`
}

type SearchParam struct {
	Value string `json:"value"`
	Regex bool   `json:"regex"`
}

type ColumnParam struct {
	Data      string `json:"data"`
	Name      string `json:"name"`
	Orderable bool   `json:"orderable"`
}

type DataTablesParam struct {
	Draw    int           `json:"draw"`
	Start   int           `json:"start"`
	Length  int           `json:"length"`
	Columns []ColumnParam `json:"columns"`
	Order   []OrderParam  `json:"order"`
	Search  SearchParam   `json:"search"`
}
