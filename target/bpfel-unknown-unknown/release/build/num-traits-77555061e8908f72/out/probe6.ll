; ModuleID = 'probe6.9262d2b3-cgu.0'
source_filename = "probe6.9262d2b3-cgu.0"
target datalayout = "e-m:e-p:64:64-i64:64-n32:64-S128"
target triple = "bpfel"

@alloc3 = private unnamed_addr constant <{ [75 x i8] }> <{ [75 x i8] c"/Users/runner/work/sbf-tools/sbf-tools/out/rust/library/core/src/num/mod.rs" }>, align 1
@alloc4 = private unnamed_addr constant <{ ptr, [16 x i8] }> <{ ptr @alloc3, [16 x i8] c"K\00\00\00\00\00\00\00Z\03\00\00\05\00\00\00" }>, align 8
@str.0 = internal constant [25 x i8] c"attempt to divide by zero"

; probe6::probe
; Function Attrs: nounwind
define void @_ZN6probe65probe17h6407c3c353180bd7E() unnamed_addr #0 {
start:
  %0 = call i1 @llvm.expect.i1(i1 false, i1 false)
  br i1 %0, label %panic.i, label %"_ZN4core3num21_$LT$impl$u20$u32$GT$10div_euclid17hb7f7a90b369f4df3E.exit"

panic.i:                                          ; preds = %start
; call core::panicking::panic
  call void @_ZN4core9panicking5panic17h47a1e83011980f05E(ptr align 1 @str.0, i64 25, ptr align 8 @alloc4) #3
  unreachable

"_ZN4core3num21_$LT$impl$u20$u32$GT$10div_euclid17hb7f7a90b369f4df3E.exit": ; preds = %start
  br label %bb1

bb1:                                              ; preds = %"_ZN4core3num21_$LT$impl$u20$u32$GT$10div_euclid17hb7f7a90b369f4df3E.exit"
  ret void
}

; Function Attrs: nocallback nofree nosync nounwind readnone willreturn
declare i1 @llvm.expect.i1(i1, i1) #1

; core::panicking::panic
; Function Attrs: cold noinline noreturn nounwind
declare void @_ZN4core9panicking5panic17h47a1e83011980f05E(ptr align 1, i64, ptr align 8) unnamed_addr #2

attributes #0 = { nounwind "target-cpu"="generic" "target-features"="+solana" }
attributes #1 = { nocallback nofree nosync nounwind readnone willreturn }
attributes #2 = { cold noinline noreturn nounwind "target-cpu"="generic" "target-features"="+solana" }
attributes #3 = { noreturn nounwind }

!llvm.module.flags = !{!0}

!0 = !{i32 7, !"PIC Level", i32 2}
