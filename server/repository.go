package server

import (
	"context"

	"github.com/bytebase/bytebase/api"
)

func (s *Server) ComposeRepositoryRelationship(ctx context.Context, repository *api.Repository) error {
	var err error

	repository.Creator, err = s.ComposePrincipalByID(ctx, repository.CreatorID)
	if err != nil {
		return err
	}

	repository.Updater, err = s.ComposePrincipalByID(ctx, repository.UpdaterID)
	if err != nil {
		return err
	}

	repository.VCS, err = s.ComposeVCSByID(ctx, repository.VCSID)
	if err != nil {
		return err
	}

	repository.Project, err = s.ComposeProjectlByID(ctx, repository.ProjectID)
	if err != nil {
		return err
	}

	return nil
}
