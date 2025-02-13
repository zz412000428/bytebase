package server

import (
	"context"
	"fmt"

	"github.com/bytebase/bytebase/api"
	"github.com/bytebase/bytebase/common"
	"go.uber.org/zap"
)

func NewTaskCheckMigrationSchemaExecutor(logger *zap.Logger) TaskCheckExecutor {
	return &TaskCheckMigrationSchemaExecutor{
		l: logger,
	}
}

type TaskCheckMigrationSchemaExecutor struct {
	l *zap.Logger
}

func (exec *TaskCheckMigrationSchemaExecutor) Run(ctx context.Context, server *Server, taskCheckRun *api.TaskCheckRun) (result []api.TaskCheckResult, err error) {
	taskFind := &api.TaskFind{
		ID: &taskCheckRun.TaskID,
	}
	task, err := server.TaskService.FindTask(ctx, taskFind)
	if err != nil {
		return []api.TaskCheckResult{}, common.Errorf(common.Internal, err)
	}

	instance, err := server.ComposeInstanceByID(ctx, task.InstanceID)
	if err != nil {
		return []api.TaskCheckResult{}, err
	}

	driver, err := GetDatabaseDriver(ctx, instance, "", exec.l)
	if err != nil {
		return []api.TaskCheckResult{}, err
	}
	defer driver.Close(ctx)

	setup, err := driver.NeedsSetupMigration(ctx)
	if err != nil {
		return []api.TaskCheckResult{}, err
	}

	if setup {
		return []api.TaskCheckResult{
			{
				Status:  api.TaskCheckStatusError,
				Code:    common.MigrationSchemaMissing,
				Title:   "Error",
				Content: fmt.Sprintf("Missing migration schema for instance %q", instance.Name),
			},
		}, nil
	}

	return []api.TaskCheckResult{
		{
			Status:  api.TaskCheckStatusSuccess,
			Code:    common.Ok,
			Title:   "OK",
			Content: fmt.Sprintf("Instance %q has setup migration schema", instance.Name),
		},
	}, nil
}
