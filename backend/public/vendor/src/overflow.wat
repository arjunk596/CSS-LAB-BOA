;; Hand-written WebAssembly Text module backing the stack visualizer.
;; write_byte is an UNCHECKED store — deliberately, since it mirrors
;; exactly what an unsafe C buffer write does: no bounds check against
;; any buffer size, just a raw write at the given address. This lets the
;; visualizer show a real overflow into adjacent memory, using actual
;; WebAssembly linear memory rather than a simulated JS array.
(module
  (memory (export "memory") 1)

  (func (export "write_byte") (param $addr i32) (param $value i32)
    local.get $addr
    local.get $value
    i32.store8)

  (func (export "read_byte") (param $addr i32) (result i32)
    local.get $addr
    i32.load8_u)

  (func (export "reset_region")
    (local $i i32)
    (local.set $i (i32.const 0))
    (block $done
      (loop $loop
        (br_if $done (i32.ge_u (local.get $i) (i32.const 64)))
        (i32.store8 (local.get $i) (i32.const 0))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $loop))))
)
