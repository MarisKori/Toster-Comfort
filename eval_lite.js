var TYPE_NUMBER = 5;
var TYPE_LITERAL = 2;
var TYPE_STRING = 3;
var TYPE_BRACKETS = 4;
var TYPE_OPERATOR = 1;
var TYPE_FUNCTION = 6;
var TYPE_COMMA = 7;

var NEW_SYMBOL_TOKENS = {
	'(':TYPE_BRACKETS, ')':TYPE_BRACKETS,
	'!':1,
	'<':1, '>':1,
	',':TYPE_COMMA,
}
var SYMBOL_TOKENS = {
	'(':TYPE_BRACKETS, ')':TYPE_BRACKETS,
	'!':1,
	'+':1, '-':1, '*':1, '/':1, '%':1,
	'<':1, '>':1,
	'==':1, '!=':1, '>=':1, '<=':1, '||':1, '&&':1,
	'===':1, '!==':1,
	',':TYPE_COMMA,
}
var OPERATOR_PRIORITY = {
	'(':20, ')':20,
	'!':16,
	'*':14, '/':14, '%':14,
	'+':13, '-':13,
	'<':11, '<=':11, '>':11, '>=':11,
	'==':10, '!=':10, '===':10, '!==':10,
	'&&':6,
	'||':5,
}
var TOKEN_FN = {
	'!':s=>new Token(!s.pop().token),
	'*':s=>new Token(s.pop() * s.pop()),
	'/':s=>{ let b=s.pop();let a=s.pop(); return new Token(a/b); },
	'%':s=>{ let b=s.pop();let a=s.pop(); return new Token(a%b); },
	'+':s=>new Token(s.pop() + s.pop()),
	'-':s=>{ let b=s.pop();let a=s.pop(); return new Token(a-b); },
	'<':s=>new Token(s.pop() > s.pop()),
	'<=':s=>new Token(s.pop() >= s.pop()),
	'>':s=>new Token(s.pop() < s.pop()),
	'>=':s=>new Token(s.pop() <= s.pop()),
	'==':s=>new Token(s.pop().token == s.pop().token),
	'!=':s=>new Token(s.pop().token != s.pop().token),
	'===':s=>new Token(s.pop().token === s.pop().token),
	'!==':s=>new Token(s.pop().token !== s.pop().token),
	'&&':s=>new Token(s.pop().token && s.pop().token),
	'||':s=>new Token(s.pop().token || s.pop().token),
	//custom functions
	'tag':s=>new Token(outer_tag(s.pop().token)), // outer_tag is external function.
}

Array.prototype.peek = function() {
	return this.slice(-1)[0];
};

function Token(token,type) {
	if (token === undefined) token = current_token;
	this.token = token;
	if (type === undefined) type = TYPE_NUMBER;
	this.type = type;
	if (type == TYPE_OPERATOR) this.priority = OPERATOR_PRIORITY[token] || 999; //error
	if (TOKEN_FN[token]) this.fn = TOKEN_FN[token];
}
Token.prototype.toString = function() {
    return this.token;
};
Token.prototype.valueOf = function() {
    return this.token;
};


// "(1+2)*3" -----> ["(", 1, "+", 2, ")", "*", 3]
function MakeTokens(str) {
	let tokens = [];
	let current_token = '';
	let current_type = 0;
	function AddToken() {
		if (current_type == TYPE_NUMBER) current_token-=0;
		else if (current_type == TYPE_STRING) current_token = current_token.substring(1,current_token.length); //cut quotes
		else if (current_type == TYPE_LITERAL) {
			if (current_token === 'true') {
				current_token = true;
				current_type = TYPE_NUMBER;
			} else if (current_token === 'false') {
				current_token = false;
				current_type = TYPE_NUMBER;
			} else if (TOKEN_FN[current_token]) { // (custom) function
				current_type = TYPE_FUNCTION;
			}
		} else if (current_type == TYPE_OPERATOR) {
			if (SYMBOL_TOKENS[current_token]) current_type = SYMBOL_TOKENS[current_token];
		}
		tokens.push(new Token(current_token, current_type));
		current_token = '';
	}
	for(let i=0;i<str.length;i++){
		let c = str[i];
		if (c == " ") {
			if (current_token !== '') {
				AddToken(); //tokens.push(new Token());
			}
		} else if (current_type == 0) {
			current_token += c;
			if (c=='(' || c==')') AddToken();
			else {
				if (c.match(/[0-9.]/)) current_type = TYPE_NUMBER;
				else if (c.match(/[_a-zA-Zа-яА-ЯёЁ]/)) current_type = TYPE_LITERAL;
				else if (c.match(/['"`]/)) current_type = TYPE_STRING;
				//else if (c.match(/[()]/)) current_type = TYPE_BRACKETS;
				else current_type = TYPE_OPERATOR;
			}
		} else {
			if (current_type == TYPE_NUMBER) {
				if (c.match(/[0-9.]/)) current_token += c;
				else {
					AddToken(); //tokens.push(current_token);
					i--;
				}
			} else if (current_type == TYPE_LITERAL) {
				if (c.match(/[_0-9a-zA-Zа-яА-ЯёЁ]/)) current_token += c;
				else {
					AddToken(); //tokens.push(current_token);
					i--;
				}
			} else if (current_type == TYPE_STRING) {
				let quote = current_token[0];
				if (c == quote && current_token[current_token.length-1] != '\\') {
					AddToken(); //tokens.push(current_token);
				} else current_token += c;
			} else if (current_type == TYPE_OPERATOR) {
				if (!c.match(/[_0-9a-zA-Zа-яА-ЯёЁ'"`]/)) {
					if (NEW_SYMBOL_TOKENS[c]) {
						AddToken();
						i--;
					} else current_token += c;
				}
				else {
					AddToken(); //tokens.push(current_token);
					i--;
				}
			} 
		}
		if (current_token === '') current_type = 0;
	}
	if (current_token !== '') AddToken(); //tokens.push(current_token);
	return tokens;
}

// [1, "+", 2, "*", 3] -----> [1, 2, 3, "*", "+"]
function MakeRPN(tokens) { // https://en.wikipedia.org/wiki/Reverse_Polish_notation
	let output = [];
	let stack = [];
	for (let i=0;i<tokens.length;i++) {
		let token = tokens[i];
		let type = token.type;
		if (type == TYPE_NUMBER || type == TYPE_LITERAL || type == TYPE_STRING) {
			output.push(token);
		} else if (type == TYPE_FUNCTION) {
			stack.push(token);
		} else if (type == TYPE_COMMA) {
			while (true) {
				if (!stack.length) {
					console.warn("Missing '(' or ','"); //ERROR
					break;
				} else if (stack.peek() == '(') break;
				else output.push(stack.pop());
			}
		} else if (type == TYPE_OPERATOR) {
			while (true) {
				if (stack.length === 0) break;
				let peek = stack.peek();
				if (peek == '(' || peek.type != TYPE_OPERATOR) break;
				if (token.priority > peek.priority) break;
				output.push(stack.pop());
			}
			stack.push(token);
		} else if (token == '(') {
			stack.push(token);
		} else if (token == ')') {
			while (stack.length > 0 && stack.peek() != '(') {
				//только операторы?
				output.push(stack.pop());
			}
			if (stack.length === 0) console.warn("Missing '('");
			stack.pop();
			if (stack.length && stack.peek().type == TYPE_FUNCTION) output.push(stack.pop());
		} else console.warn('Unknown token type:',type);
	}
	while (stack.length) {
		let op = stack.pop();
		if (op.type == TYPE_BRACKETS) console.warn('Unexpected bracket');
		else output.push(op);
	}
	return output;
}

function CalcRPN(rpn, env) { // https://en.wikipedia.org/wiki/Shunting-yard_algorithm
	let stack = [];
	rpn.forEach(token=>{
		let type = token.type;
		if (type == TYPE_NUMBER || type == TYPE_STRING) {
			stack.push(token);
		} else if (type == TYPE_LITERAL) {
			let v = env[token.token]; //value from environment
			if (v === undefined) {
				console.warn('Unknown variable:',token);
			} else {
				let tok;
				if (typeof v == 'function') {
					tok = new Token(v.name, TYPE_FUNCTION);
					if (v.count) {
						tok.fn = function(s) {
							return new Token(v(...s.splice(s.length-v.count))); //magic
						}
					}
					else tok.fn = v;
				}
				else tok = new Token(v, TYPE_NUMBER);
				stack.push(tok);
			}
		} else if (type == TYPE_OPERATOR || type == TYPE_FUNCTION) {
			let resToken = token.fn(stack);
			stack.push(resToken);
		} else console.warn("Can't process token, bad type:",token);
	});
	if (stack.length != 1) console.warn('Final RPN stack len:',stack.length, stack);
	return stack[0].token;
}

function EvalLite(str,env) {
	let tokens = MakeTokens(str);
	let rpn = MakeRPN(tokens);
	let result = CalcRPN([...rpn], env);
	return result;
}

eval_lite = EvalLite;
eval.lite = EvalLite;

//Example: EvalLite('x>7', {x:8}); //true