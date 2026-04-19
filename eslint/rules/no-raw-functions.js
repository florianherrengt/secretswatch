import { ESLintUtils } from '@typescript-eslint/utils';

export default ESLintUtils.RuleCreator(() => '')({
	name: 'no-raw-functions',
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow functions unless used inside z.function().implement()',
		},
		schema: [],
		messages: {
			forbidden: 'Functions must be defined via z.function().implement()',
		},
	},
	defaultOptions: [],
	create(context) {
		/**
		 * Check if node is inside `.implement(...)`
		 */
		function isInsideZodImplement(node) {
			let current = node.parent;

			while (current) {
				if (
					current.type === 'CallExpression' &&
					current.callee.type === 'MemberExpression' &&
					current.callee.property.type === 'Identifier' &&
					current.callee.property.name === 'implement'
				) {
					return true;
				}
				current = current.parent;
			}

			return false;
		}

		/**
		 * Allow some common JS functional patterns
		 */
		const ALLOWED_METHODS = new Set([
			'map',
			'filter',
			'reduce',
			'forEach',
			'some',
			'every',
			'find',
			'flatMap',
		]);

		function isAllowedCallback(node) {
			let current = node.parent;

			while (current) {
				if (
					current.type === 'CallExpression' &&
					current.callee.type === 'MemberExpression' &&
					current.callee.property.type === 'Identifier' &&
					ALLOWED_METHODS.has(current.callee.property.name)
				) {
					return true;
				}
				current = current.parent;
			}

			return false;
		}

		/**
		 * Allow test files
		 */
		const filename = context.filename;
		const isTestFile =
			filename.endsWith('.test.ts') ||
			filename.endsWith('.spec.ts') ||
			filename.endsWith('.test.js') ||
			filename.endsWith('.spec.js');

		/**
		 * Core check
		 */
		function check(node) {
			if (isTestFile) return;

			if (isInsideZodImplement(node)) return;

			if (isAllowedCallback(node)) return;

			context.report({
				node,
				messageId: 'forbidden',
			});
		}

		return {
			FunctionDeclaration: check,
			FunctionExpression: check,
			ArrowFunctionExpression: check,
		};
	},
});
