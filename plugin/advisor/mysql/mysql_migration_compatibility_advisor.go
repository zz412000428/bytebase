package mysql

import (
	"fmt"

	"github.com/bytebase/bytebase/common"
	"github.com/bytebase/bytebase/plugin/advisor"
	"github.com/bytebase/bytebase/plugin/db"

	"github.com/pingcap/parser"
	"github.com/pingcap/parser/ast"
	_ "github.com/pingcap/tidb/types/parser_driver"
)

var (
	_ advisor.Advisor = (*CompatibilityAdvisor)(nil)
)

func init() {
	advisor.Register(db.MySQL, advisor.MySQLMigrationCompatibility, &CompatibilityAdvisor{})
	advisor.Register(db.TiDB, advisor.MySQLMigrationCompatibility, &CompatibilityAdvisor{})
}

type CompatibilityAdvisor struct {
}

// A fake advisor to report 1 advice for each severity.
func (adv *CompatibilityAdvisor) Check(ctx advisor.AdvisorContext, statement string) ([]advisor.Advice, error) {
	p := parser.New()

	root, _, err := p.Parse(statement, ctx.Charset, ctx.Collation)
	if err != nil {
		return []advisor.Advice{
			{
				Status:  advisor.Error,
				Title:   "Syntax error",
				Content: err.Error(),
			},
		}, nil
	}

	c := &compatibilityChecker{}
	for _, stmtNode := range root {
		(stmtNode).Accept(c)
	}

	if len(c.advisorList) == 0 {
		c.advisorList = append(c.advisorList, advisor.Advice{
			Status:  advisor.Success,
			Code:    common.Ok,
			Title:   "OK",
			Content: "Migration is backward compatible"})
	}
	return c.advisorList, nil
}

type compatibilityChecker struct {
	advisorList []advisor.Advice
}

func (v *compatibilityChecker) Enter(in ast.Node) (ast.Node, bool) {
	code := common.Ok
	// DROP DATABASE
	if _, ok := in.(*ast.DropDatabaseStmt); ok {
		code = common.CompatibilityDropDatabase
		goto END
	}
	// RENAME TABLE
	if _, ok := in.(*ast.RenameTableStmt); ok {
		code = common.CompatibilityRenameTable
		goto END
	}
	// DROP TABLE/VIEW
	if _, ok := in.(*ast.DropTableStmt); ok {
		code = common.CompatibilityDropTable
		goto END
	}
	// ALTER TABLE
	if node, ok := in.(*ast.AlterTableStmt); ok {
		for _, spec := range node.Specs {
			fmt.Printf("spec %d: %+v\n\n", spec.Tp, spec)
			// RENAME COLUMN
			if spec.Tp == ast.AlterTableRenameColumn {
				code = common.CompatibilityRenameColumn
				goto END
			}
			// DROP COLUMN
			if spec.Tp == ast.AlterTableDropColumn {
				code = common.CompatibilityDropColumn
				goto END
			}

			if spec.Tp == ast.AlterTableAddConstraint {
				// ADD PRIMARY KEY
				if spec.Constraint.Tp == ast.ConstraintPrimaryKey {
					code = common.CompatibilityAddPrimaryKey
					goto END
				}
				// ADD UNIQUE/UNIQUE KEY/UNIQUE INDEX
				if spec.Constraint.Tp == ast.ConstraintPrimaryKey ||
					spec.Constraint.Tp == ast.ConstraintUniq ||
					spec.Constraint.Tp == ast.ConstraintUniqKey {
					code = common.CompatibilityAddUniqueKey
					goto END
				}
				// ADD FOREIGN KEY
				if spec.Constraint.Tp == ast.ConstraintForeignKey {
					code = common.CompatibilityAddForeignKey
					goto END
				}
				// Check is only supported after 8.0.16 https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html
				// ADD CHECK ENFORCED
				if spec.Constraint.Tp == ast.ConstraintCheck && spec.Constraint.Enforced {
					code = common.CompatibilityAddCheck
					goto END
				}
			}

			// Check is only supported after 8.0.16 https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html
			// ALTER CHECK ENFORCED
			if spec.Tp == ast.AlterTableAlterCheck {
				if spec.Constraint.Enforced {
					code = common.CompatibilityAlterCheck
					goto END
				}
			}

			// MODIFY COLUMN / CHANGE COLUMN
			// Due to the limitation that we don't know the current data type of the column before the change,
			// so we treat all as incompatible. This generates false positive when:
			// 1. Change to a compatible data type such as INT to BIGINT
			// 2. Change property like comment, change it to NULL
			if spec.Tp == ast.AlterTableModifyColumn || spec.Tp == ast.AlterTableChangeColumn {
				code = common.CompatibilityAlterColumn
				goto END
			}
		}
	}
	// ALTER VIEW TBD: https://github.com/pingcap/parser/pull/1252
	// if node, ok := in.(*ast.AlterViewStmt); ok {
	// }

	// CREATE UNIQUE INDEX
	if node, ok := in.(*ast.CreateIndexStmt); ok {
		if node.KeyType == ast.IndexKeyTypeUnique {
			code = common.CompatibilityAddUniqueKey
			goto END
		}
	}

END:
	if code != common.Ok {
		v.advisorList = append(v.advisorList, advisor.Advice{
			Status:  advisor.Warn,
			Code:    code,
			Title:   "Potential incompatible migration",
			Content: fmt.Sprintf("%q may cause incompatibility with the existing data and code", in.Text()),
		})
	}
	return in, false
}

func (v *compatibilityChecker) Leave(in ast.Node) (ast.Node, bool) {
	return in, true
}
