package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/tether-erp/config"
	"github.com/tether-erp/utils"
)

// AdminGetSupportDocuments returns a platform-wide list of documents for support.
// NOTE: relations (organization, creator, workflow) are NOT preloaded — clients should
// use the dedicated endpoints for those. TODO: add JOINs if needed for support UX.
func AdminGetSupportDocuments(c *fiber.Ctx) error {
	ctx := c.Context()

	conds := []string{"deleted_at IS NULL"}
	args := []interface{}{}
	add := func(cnd string, a ...interface{}) {
		for _, v := range a {
			args = append(args, v)
			cnd = strings.Replace(cnd, "?", "$"+strconv.Itoa(len(args)), 1)
		}
		conds = append(conds, cnd)
	}

	if v := c.Query("org_id"); v != "" {
		add("organization_id = ?", v)
	}
	if v := c.Query("user_id"); v != "" {
		add("created_by = ?", v)
	}
	if v := c.Query("type"); v != "" {
		add("document_type = ?", v)
	}
	if v := c.Query("status"); v != "" {
		add("status = ?", v)
	}
	if v := c.Query("search"); v != "" {
		p := "%" + v + "%"
		add("(title ILIKE ? OR document_number ILIKE ?)", p, p)
	}
	where := " WHERE " + strings.Join(conds, " AND ")

	var total int64
	if err := config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM documents"+where, args...).Scan(&total); err != nil {
		return utils.SendInternalError(c, "Failed to count documents", err)
	}

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	if limit > 100 {
		limit = 100
	}
	offset := (page - 1) * limit

	args = append(args, limit, offset)
	q := "SELECT id, organization_id, document_type, document_number, title, status, created_by, created_at, updated_at FROM documents" +
		where + " ORDER BY created_at DESC LIMIT $" + strconv.Itoa(len(args)-1) + " OFFSET $" + strconv.Itoa(len(args))

	rows, err := config.PgxDB.Query(ctx, q, args...)
	if err != nil {
		return utils.SendInternalError(c, "Failed to fetch documents", err)
	}
	defer rows.Close()

	docs := []map[string]interface{}{}
	for rows.Next() {
		var id, orgID, docType, docNum, title, status, createdBy string
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&id, &orgID, &docType, &docNum, &title, &status, &createdBy, &createdAt, &updatedAt); err != nil {
			return utils.SendInternalError(c, "Failed to scan document", err)
		}
		docs = append(docs, map[string]interface{}{
			"id":              id,
			"organizationId":  orgID,
			"documentType":    docType,
			"documentNumber":  docNum,
			"title":           title,
			"status":          status,
			"createdBy":       createdBy,
			"createdAt":       createdAt,
			"updatedAt":       updatedAt,
		})
	}

	totalPages := int(total) / limit
	if int(total)%limit != 0 {
		totalPages++
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Documents retrieved successfully",
		"data":    docs,
		"pagination": fiber.Map{
			"total":       total,
			"page":        page,
			"page_size":   limit,
			"total_pages": totalPages,
			"has_next":    page < totalPages,
			"has_prev":    page > 1,
		},
	})
}

func AdminGetSupportDocument(c *fiber.Ctx) error {
	docID := c.Params("id")
	var (
		id, orgID, docType, docNum, title, status, createdBy string
		desc, currency, dept                                 *string
		amount                                               *float64
		data, metadata                                       []byte
		createdAt, updatedAt                                 time.Time
	)
	err := config.PgxDB.QueryRow(c.Context(), `
		SELECT id, organization_id, document_type, document_number, title, description, status, amount, currency, department, created_by, data, metadata, created_at, updated_at
		FROM documents WHERE id = $1`, docID).
		Scan(&id, &orgID, &docType, &docNum, &title, &desc, &status, &amount, &currency, &dept, &createdBy, &data, &metadata, &createdAt, &updatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.SendNotFound(c, "Document not found")
		}
		return utils.SendInternalError(c, "Failed to fetch document", err)
	}

	doc := map[string]interface{}{
		"id":             id,
		"organizationId": orgID,
		"documentType":   docType,
		"documentNumber": docNum,
		"title":          title,
		"description":    desc,
		"status":         status,
		"amount":         amount,
		"currency":       currency,
		"department":     dept,
		"createdBy":      createdBy,
		"data":           json.RawMessage(data),
		"metadata":       json.RawMessage(metadata),
		"createdAt":      createdAt,
		"updatedAt":      updatedAt,
	}
	return utils.SendSimpleSuccess(c, doc, "Document retrieved successfully")
}

func AdminGetSupportWorkflowTasks(c *fiber.Ctx) error {
	ctx := c.Context()

	conds := []string{}
	args := []interface{}{}
	add := func(cnd string, a ...interface{}) {
		for _, v := range a {
			args = append(args, v)
			cnd = strings.Replace(cnd, "?", "$"+strconv.Itoa(len(args)), 1)
		}
		conds = append(conds, cnd)
	}

	if v := c.Query("org_id"); v != "" {
		add("organization_id = ?", v)
	}
	if v := c.Query("entity_id"); v != "" {
		add("entity_id = ?", v)
	}
	if v := c.Query("status"); v != "" {
		add("status = ?", v)
	}
	if c.Query("stalled") == "true" {
		add("UPPER(status) = 'CLAIMED' AND claimed_at < ?", time.Now().Add(-30*time.Minute))
	}

	where := ""
	if len(conds) > 0 {
		where = " WHERE " + strings.Join(conds, " AND ")
	}

	var total int64
	if err := config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM workflow_tasks"+where, args...).Scan(&total); err != nil {
		return utils.SendInternalError(c, "Failed to count workflow tasks", err)
	}

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	if limit > 100 {
		limit = 100
	}
	offset := (page - 1) * limit

	args = append(args, limit, offset)
	q := "SELECT id, organization_id, entity_id, entity_type, status, assigned_user_id, assigned_role, claimed_by, claimed_at, due_date, created_at, updated_at FROM workflow_tasks" +
		where + " ORDER BY created_at DESC LIMIT $" + strconv.Itoa(len(args)-1) + " OFFSET $" + strconv.Itoa(len(args))

	rows, err := config.PgxDB.Query(ctx, q, args...)
	if err != nil {
		return utils.SendInternalError(c, "Failed to fetch workflow tasks", err)
	}
	defer rows.Close()

	tasks := []map[string]interface{}{}
	for rows.Next() {
		var (
			id, orgID, entityID, entityType, status string
			assignedUserID, assignedRole, claimedBy *string
			claimedAt, dueDate                      *time.Time
			createdAt, updatedAt                    time.Time
		)
		if err := rows.Scan(&id, &orgID, &entityID, &entityType, &status, &assignedUserID, &assignedRole, &claimedBy, &claimedAt, &dueDate, &createdAt, &updatedAt); err != nil {
			return utils.SendInternalError(c, "Failed to scan workflow task", err)
		}
		tasks = append(tasks, map[string]interface{}{
			"id":               id,
			"organizationId":   orgID,
			"entityId":         entityID,
			"entityType":       entityType,
			"status":           status,
			"assignedUserId":   assignedUserID,
			"assignedRole":     assignedRole,
			"claimedBy":        claimedBy,
			"claimedAt":        claimedAt,
			"dueDate":          dueDate,
			"createdAt":        createdAt,
			"updatedAt":        updatedAt,
		})
	}

	totalPages := int(total) / limit
	if int(total)%limit != 0 {
		totalPages++
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Workflow tasks retrieved successfully",
		"data":    tasks,
		"pagination": fiber.Map{
			"total":       total,
			"page":        page,
			"page_size":   limit,
			"total_pages": totalPages,
			"has_next":    page < totalPages,
			"has_prev":    page > 1,
		},
	})
}

func AdminGetSupportWorkflowTask(c *fiber.Ctx) error {
	taskID := c.Params("id")
	var (
		id, orgID, entityID, entityType, status string
		assignedUserID, assignedRole, claimedBy *string
		claimedAt, dueDate                      *time.Time
		createdAt, updatedAt                    time.Time
	)
	err := config.PgxDB.QueryRow(c.Context(), `
		SELECT id, organization_id, entity_id, entity_type, status, assigned_user_id, assigned_role, claimed_by, claimed_at, due_date, created_at, updated_at
		FROM workflow_tasks WHERE id = $1`, taskID).
		Scan(&id, &orgID, &entityID, &entityType, &status, &assignedUserID, &assignedRole, &claimedBy, &claimedAt, &dueDate, &createdAt, &updatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.SendNotFound(c, "Workflow task not found")
		}
		return utils.SendInternalError(c, "Failed to fetch workflow task", err)
	}

	task := map[string]interface{}{
		"id":             id,
		"organizationId": orgID,
		"entityId":       entityID,
		"entityType":     entityType,
		"status":         status,
		"assignedUserId": assignedUserID,
		"assignedRole":   assignedRole,
		"claimedBy":      claimedBy,
		"claimedAt":      claimedAt,
		"dueDate":        dueDate,
		"createdAt":      createdAt,
		"updatedAt":      updatedAt,
	}
	return utils.SendSimpleSuccess(c, task, "Workflow task retrieved successfully")
}

func AdminReassignWorkflowTask(c *fiber.Ctx) error {
	taskID := c.Params("id")
	callerID, _ := c.Locals("userID").(string)
	ctx := c.Context()

	var req struct {
		NewAssigneeID string `json:"new_assignee_id"`
		Reason        string `json:"reason"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequest(c, "Invalid request body")
	}
	if req.NewAssigneeID == "" {
		return utils.SendBadRequest(c, "new_assignee_id is required")
	}

	// Verify task exists
	var existsID string
	if err := config.PgxDB.QueryRow(ctx, "SELECT id FROM workflow_tasks WHERE id = $1", taskID).Scan(&existsID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.SendNotFound(c, "Workflow task not found")
		}
		return utils.SendInternalError(c, "Failed to load task", err)
	}

	// Verify the new assignee exists
	var userCount int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE id = $1 AND deleted_at IS NULL", req.NewAssigneeID).Scan(&userCount)
	if userCount == 0 {
		return utils.SendNotFound(c, "New assignee user not found")
	}

	now := time.Now()
	_, err := config.PgxDB.Exec(ctx, `
		UPDATE workflow_tasks
		SET assignment_type = $1, assigned_user_id = $2, status = $3, claimed_by = NULL, claimed_at = NULL, updated_at = $4
		WHERE id = $5`,
		"specific_user", req.NewAssigneeID, "PENDING", now, taskID,
	)
	if err != nil {
		return utils.SendInternalError(c, "Failed to reassign workflow task", err)
	}

	logDetails, _ := json.Marshal(map[string]interface{}{
		"new_value":   fmt.Sprintf("task:%s → user:%s", taskID, req.NewAssigneeID),
		"description": fmt.Sprintf("Reason: %s", req.Reason),
	})
	_, _ = config.PgxDB.Exec(ctx,
		`INSERT INTO admin_audit_logs (id, action, admin_user_id, details, created_at) VALUES ($1, $2, $3, $4, $5)`,
		utils.GenerateID(), "support_workflow_task_reassigned", callerID, logDetails, now,
	)

	return utils.SendSimpleSuccess(c, map[string]interface{}{"id": taskID}, "Workflow task reassigned successfully")
}

func AdminResetWorkflowTask(c *fiber.Ctx) error {
	taskID := c.Params("id")
	callerID, _ := c.Locals("userID").(string)
	ctx := c.Context()

	var req struct {
		Reason string `json:"reason"`
	}
	_ = c.BodyParser(&req)

	var existsID string
	if err := config.PgxDB.QueryRow(ctx, "SELECT id FROM workflow_tasks WHERE id = $1", taskID).Scan(&existsID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.SendNotFound(c, "Workflow task not found")
		}
		return utils.SendInternalError(c, "Failed to load task", err)
	}

	now := time.Now()
	_, err := config.PgxDB.Exec(ctx, `
		UPDATE workflow_tasks SET status = $1, claimed_by = NULL, claimed_at = NULL, updated_at = $2 WHERE id = $3`,
		"PENDING", now, taskID,
	)
	if err != nil {
		return utils.SendInternalError(c, "Failed to reset workflow task", err)
	}

	logDetails, _ := json.Marshal(map[string]interface{}{
		"new_value":   taskID,
		"description": fmt.Sprintf("Task reset to pending. Reason: %s", req.Reason),
	})
	_, _ = config.PgxDB.Exec(ctx,
		`INSERT INTO admin_audit_logs (id, action, admin_user_id, details, created_at) VALUES ($1, $2, $3, $4, $5)`,
		utils.GenerateID(), "support_workflow_task_reset", callerID, logDetails, now,
	)

	return utils.SendSimpleSuccess(c, map[string]interface{}{"id": taskID}, "Workflow task reset to pending successfully")
}
