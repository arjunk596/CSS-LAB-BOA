#include <stdio.h>
#include <stdlib.h>

void vulnerable_index(int idx, int value) {
    int arr[10];
    for (int i = 0; i < 10; i++) arr[i] = i;

    arr[idx] = value; /* VULNERABLE: idx never validated, can be negative or >=10 */
    printf("arr[%d] = %d\n", idx, arr[idx]);
}

int main(int argc, char *argv[]) {
    if (argc < 3) { printf("Usage: %s <index> <value>\n", argv[0]); return 1; }
    vulnerable_index(atoi(argv[1]), atoi(argv[2]));
    printf("Returned safely.\n");
    return 0;
}
