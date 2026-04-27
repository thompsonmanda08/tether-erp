package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tether-erp/config"
	db "github.com/tether-erp/database/sqlc"
	"github.com/tether-erp/utils"
)

// pgUUIDString renders a pgtype.UUID as a canonical hyphenated string ("" if invalid).
func pgUUIDString(id pgtype.UUID) string {
	if !id.Valid {
		return ""
	}
	return uuid.UUID(id.Bytes).String()
}

// parsePgUUID parses a hyphenated UUID string into a pgtype.UUID.
// Returns an invalid value if parsing fails.
func parsePgUUID(s string) pgtype.UUID {
	var u pgtype.UUID
	_ = u.Scan(s)
	return u
}

func provinceToMap(p db.Province) map[string]interface{} {
	return map[string]interface{}{
		"id":   pgUUIDString(p.ID),
		"name": p.Name,
		"code": p.Code,
	}
}

func townToMap(t db.Town) map[string]interface{} {
	code := ""
	if t.Code != nil {
		code = *t.Code
	}
	return map[string]interface{}{
		"id":         pgUUIDString(t.ID),
		"provinceId": pgUUIDString(t.ProvinceID),
		"name":       t.Name,
		"code":       code,
	}
}

// GetProvinces returns all Zambian provinces ordered by name.
// GET /api/v1/provinces
func GetProvinces(c *fiber.Ctx) error {
	rows, err := config.Queries.ListProvinces(c.Context())
	if err != nil {
		return utils.SendInternalError(c, "Failed to retrieve provinces", err)
	}
	out := make([]map[string]interface{}, 0, len(rows))
	for _, p := range rows {
		out = append(out, provinceToMap(p))
	}
	return utils.SendSimpleSuccess(c, out, "Provinces retrieved successfully")
}

// GetTowns returns towns/districts, optionally filtered by province_id.
// GET /api/v1/towns?province_id=<uuid>
func GetTowns(c *fiber.Ctx) error {
	ctx := c.Context()

	var rows []db.Town
	var err error
	if pid := c.Query("province_id"); pid != "" {
		rows, err = config.Queries.ListTownsByProvince(ctx, db.ListTownsByProvinceParams{
			ProvinceID: parsePgUUID(pid),
		})
	} else {
		rows, err = config.Queries.ListTowns(ctx)
	}
	if err != nil {
		return utils.SendInternalError(c, "Failed to retrieve towns", err)
	}

	out := make([]map[string]interface{}, 0, len(rows))
	for _, t := range rows {
		out = append(out, townToMap(t))
	}
	return utils.SendSimpleSuccess(c, out, "Towns retrieved successfully")
}
