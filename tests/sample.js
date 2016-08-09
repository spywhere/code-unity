/// Addition Operation
///   Arithmetic addition operation
/// Arguments:
///   leftOperand (number): A left-hand side operand
///   rightOperand (number): A right-hand side operand
/// Returns:
///   result (number): A result after do an operation
///
/// UnitTest
///   Test positive addition:
///     Test: add (1 + 1)
///     Expected: 2
///   Test negative addition:
///     Test: add (-1 + -1)
///     Expected: -2
///   Test positive/negative addition
///     Test: add (5 + -2)
///     Expected: 3
///   Test negative/positive addition
///     Test: add (-2 + 5)
///     Expected: 3
function add (leftOperand, rightOperand) {
    return leftOperand + rightOperand;
}
